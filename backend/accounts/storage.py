import os
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class GridFSStorage(Storage):
    """
    Custom storage class to store files in MongoDB GridFS.
    """
    def __init__(self):
        # Lazy initialization: Do not connect yet to avoid migration serialization errors
        self._client = None
        self._db = None
        self._fs = None
        self._use_gridfs = None

    def _setup(self):
        """Connect to MongoDB only when needed"""
        if self._fs is None and self._use_gridfs is None:
            try:
                from pymongo import MongoClient
                from gridfs import GridFS
                mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
                # Short timeout to fail fast if MongoDB is unreachable
                self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
                self._client.admin.command('ping')
                self._db = self._client.get_database()
                self._fs = GridFS(self._db)
                self._use_gridfs = True
            except Exception:
                self._use_gridfs = False

    def _open(self, name, mode='rb'):
        """Open a file from GridFS for reading"""
        self._setup()
        if self._use_gridfs:
            from django.core.files.base import ContentFile
            try:
                from bson.objectid import ObjectId
                file = self._fs.find_one({'_id': ObjectId(name)})
            except Exception:
                file = self._fs.find_one({'filename': name})
            if file:
                return ContentFile(file.read())
            raise FileNotFoundError(f"File {name} not found in GridFS")
        raise FileNotFoundError(f"GridFS not available and file {name} not found")

    def _save(self, name, content):
        self._setup()
        if self._use_gridfs:
            file_id = self._fs.put(content, filename=name)
            return str(file_id)
        raise Exception("GridFS not available - cannot save file")

    def exists(self, name):
        self._setup()
        if self._use_gridfs:
            return self._fs.exists({'filename': name})
        return False

    def url(self, name):
        return f'/media/{name}'

    def delete(self, name):
        self._setup()
        if self._use_gridfs:
            try:
                file = self._fs.find_one({'filename': name})
                if file:
                    self._fs.delete(file._id)
            except Exception:
                pass


# Create the singleton instance
gridfs_storage = GridFSStorage()