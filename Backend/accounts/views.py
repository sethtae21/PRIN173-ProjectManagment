from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages

def home(request):
    """Home page"""
    return render(request, 'accounts/home.html')

def register_view(request):
    """User registration"""
    if request.method == 'POST':
        # Add your registration logic here
        pass
    return render(request, 'accounts/register.html')

def login_view(request):
    """User login"""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('/')
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'accounts/login.html')

@login_required
def seller_dashboard(request):
    """Seller dashboard - protected page"""
    return render(request, 'accounts/seller_dashboard.html')

def logout_view(request):
    """User logout"""
    logout(request)
    return redirect('/')