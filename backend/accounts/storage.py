import logging
import os
import time

from bson.objectid import ObjectId
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from gridfs import GridFS
from pymongo import MongoClient
from pymongo.uri_parser import parse_uri

logger = logging.getLogger(__name__)

FALLBACK_DB_NAME = "fitfusion"
SETUP_RETRY_SECONDS = 30


@deconstructible
class GridFSStorage(Storage):
    """GridFS storage with retryable setup.

    The old version cached a failed connection attempt forever
    (_use_gridfs = False), so one transient Atlas hiccup on the first
    /media/ request made every product image 404 until the server was
    restarted. This version retries at most once per SETUP_RETRY_SECONDS
    and always resolves an explicit database name (URI path, else
    FALLBACK_DB_NAME) so get_database() can never raise ConfigurationError
    on a path-less URI.
    """

    def __init__(self):
        self._client = None
        self._db = None
        self._fs = None
        self._last_setup_attempt = 0.0

    def _setup(self):
        if self._fs is not None:
            return True
        now = time.monotonic()
        if now - self._last_setup_attempt < SETUP_RETRY_SECONDS:
            return False
        self._last_setup_attempt = now
        try:
            mongo_uri = os.getenv("MONGODB_URI") or f"mongodb://localhost:27017/{FALLBACK_DB_NAME}"
            db_name = parse_uri(mongo_uri).get("database") or FALLBACK_DB_NAME
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
            client.admin.command("ping")
            self._client = client
            self._db = client.get_database(db_name)
            self._fs = GridFS(self._db)
            logger.info("GridFS storage connected (db=%s).", db_name)
            return True
        except Exception as exc:
            logger.warning(
                "GridFS setup failed (retry in %ss): %s", SETUP_RETRY_SECONDS, exc
            )
            self._client = None
            self._db = None
            self._fs = None
            return False

    def _require_fs(self):
        if self._fs is None and not self._setup():
            raise FileNotFoundError("GridFS is not reachable right now")
        return self._fs

    def _open(self, name, mode="rb"):
        fs = self._require_fs()
        file = fs.find_one({"_id": ObjectId(name)}) if ObjectId.is_valid(name) else None
        if file is None:
            file = fs.find_one({"filename": name})
        if file:
            return ContentFile(file.read())
        raise FileNotFoundError(f"File {name} not found in GridFS")

    def _save(self, name, content):
        fs = self._require_fs()
        return str(fs.put(content, filename=name))

    def exists(self, name):
        try:
            fs = self._require_fs()
        except FileNotFoundError:
            return False
        return bool(fs.exists({"filename": name}))

    def url(self, name):
        return f"/media/{name}"

    def delete(self, name):
        try:
            fs = self._require_fs()
        except FileNotFoundError:
            return
        file = fs.find_one({"_id": ObjectId(name)}) if ObjectId.is_valid(name) else None
        if file is None:
            file = fs.find_one({"filename": name})
        if file:
            fs.delete(file._id)


gridfs_storage = GridFSStorage()