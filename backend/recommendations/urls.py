from django.urls import path

from .views import RecommendationListView

app_name = "recommendations"
urlpatterns = [
    path("recommendations/", RecommendationListView.as_view(), name="list"),
]