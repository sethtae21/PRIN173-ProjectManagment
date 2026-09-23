from django.contrib.auth.decorators import login_required
from django.shortcuts import render


def home(request):
    return render(request, 'catalog/test_upload.html')


@login_required
def seller_dashboard(request):
    return render(request, 'accounts/seller_dashboard.html')
