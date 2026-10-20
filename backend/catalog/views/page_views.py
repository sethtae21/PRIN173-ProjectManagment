import mimetypes

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, Http404
from django.shortcuts import render

from accounts.storage import gridfs_storage


def home(request):
    return render(request, 'catalog/test_upload.html')


@login_required
def seller_dashboard(request):
    return render(request, 'accounts/seller_dashboard.html')


def serve_gridfs_media(request, name):
    """
    Stream media files stored in GridFS (the rembg-processed transparent PNGs).

    Django's default filesystem media serving cannot see GridFS objects, so
    /media/<name> is routed here. Public (no auth) because published catalog
    images must be visible to shoppers and guests (SRS FR-3.x, §4.2 read-only).
    """
    try:
        handle = gridfs_storage.open(name, 'rb')
        data = handle.read()
    except Exception:
        raise Http404('Media file not found')

    content_type = mimetypes.guess_type(name)[0] or 'image/png'
    response = HttpResponse(data, content_type=content_type)
    response['Cache-Control'] = 'public, max-age=86400'
    return response