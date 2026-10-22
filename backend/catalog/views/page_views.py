"""Page-style views for the catalog app.

* ``home`` / ``seller_dashboard``: legacy HTML test pages rendered from
  Django templates (imported by catalog.urls and catalog.views/__init__).
* ``serve_gridfs_media``: streams the rembg-processed transparent PNGs that
  live in MongoDB GridFS. Django's default filesystem media serving cannot
  see GridFS objects, so /media/<name> is routed here. Public (no auth)
  because published catalog images must be visible to shoppers and guests
  (SRS FR-3.x, §4.2 read-only).
"""
import logging
import mimetypes

from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse
from django.shortcuts import render

from accounts.storage import gridfs_storage

logger = logging.getLogger(__name__)

IMAGE_CACHE_SECONDS = 86400


def home(request):
    """Render the full-feature HTML test suite (/ and /test-upload/)."""
    return render(request, 'catalog/test_upload.html')


@login_required
def seller_dashboard(request):
    """Legacy seller dashboard template page."""
    return render(request, 'accounts/seller_dashboard.html')


def serve_gridfs_media(request, name):
    """Stream a GridFS-stored media file (product images, avatars, etc.).

    Returns:
      200 with the file bytes when GridFS serves the file,
      404 when the file genuinely does not exist in GridFS,
      503 when MongoDB/GridFS itself is unreachable so the frontend can
      fall back to its placeholder instead of caching a broken image.
    """
    try:
        handle = gridfs_storage.open(name, 'rb')
        try:
            data = handle.read()
        finally:
            handle.close()
    except FileNotFoundError as exc:
        # Distinguish "file missing" from "GridFS down": every storage
        # version keeps ._fs as None while the connection is unavailable.
        if getattr(gridfs_storage, '_fs', None) is None:
            logger.error("GridFS unreachable while serving %s: %s", name, exc)
            return HttpResponse(status=503)
        logger.warning("Media miss for %s: %s", name, exc)
        raise Http404('Media file not found')
    except Exception as exc:  # unexpected storage/driver failure
        logger.error("GridFS error while serving %s: %s", name, exc)
        return HttpResponse(status=503)

    content_type = mimetypes.guess_type(name)[0] or 'image/png'
    response = HttpResponse(data, content_type=content_type)
    response['Cache-Control'] = f'public, max-age={IMAGE_CACHE_SECONDS}'
    return response