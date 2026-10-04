from django.urls import path

from .views import (RatingSubmitView, RatingSummaryView,
                    MyRatingsView, RatingDetailView, GuestSessionClearView)

urlpatterns = [
    path('', RatingSubmitView.as_view(), name='rating-submit'),
    path('summary/', RatingSummaryView.as_view(), name='rating-summary'),
    path('guest-session/clear/', GuestSessionClearView.as_view(), name='guest-session-clear'),
    path('mine/', MyRatingsView.as_view(), name='rating-mine'),
    path('<str:pk>/', RatingDetailView.as_view(), name='rating-detail'),
]