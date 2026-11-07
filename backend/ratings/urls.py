from django.urls import path

from .views import (
    GuestSessionClearView,
    MyRatingsView,
    RatingDetailView,
    RatingSubmitView,
    RatingSummaryView,
    UATExportCSVView,
    UATResponseSubmitView,
    UATSessionCreateView,
)

urlpatterns = [
    path('', RatingSubmitView.as_view(), name='rating-submit'),
    path('summary/', RatingSummaryView.as_view(), name='rating-summary'),
    path('guest-session/clear/', GuestSessionClearView.as_view(), name='guest-session-clear'),
    path('mine/', MyRatingsView.as_view(), name='rating-mine'),
    path('uat/session/', UATSessionCreateView.as_view(), name='uat-session-create'),
    path('uat/response/', UATResponseSubmitView.as_view(), name='uat-response-submit'),
    path('uat/export/', UATExportCSVView.as_view(), name='uat-export-csv'),
    path('<str:pk>/', RatingDetailView.as_view(), name='rating-detail'),
]