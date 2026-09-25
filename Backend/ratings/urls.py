from django.urls import path

from .views import (RatingSubmitView, RatingSummaryView,
                    MyRatingsView, RatingDetailView)

urlpatterns = [
    path('', RatingSubmitView.as_view(), name='rating-submit'),
    path('summary/', RatingSummaryView.as_view(), name='rating-summary'),
    path('mine/', MyRatingsView.as_view(), name='rating-mine'),
    path('<str:pk>/', RatingDetailView.as_view(), name='rating-detail'),
]