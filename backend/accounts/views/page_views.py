from django.shortcuts import render
from django.contrib.auth.decorators import login_required


def home(request):
    return render(request, 'accounts/test_upload.html')


@login_required
def seller_dashboard(request):
    return render(request, 'accounts/seller_dashboard.html')