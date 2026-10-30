from django.urls import path

from .views import MatchReasonsView, RecommendationListView

app_name = "recommendations"
urlpatterns = [
    path("recommendations/", RecommendationListView.as_view(), name="list"),
    path(
        # str converter: ObjectId-safe and int-safe item ids.
        "recommendations/<str:item_id>/match-reasons/",
        MatchReasonsView.as_view(),
        name="match-reasons",
    ),
]