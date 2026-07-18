from backend.app.search.models import SearchRequest


def validate_search_request(req: SearchRequest) -> None:
    """Perform basic validations on the search request.

    Raises ValueError on invalid input.
    """
    if not req.query or not req.query.strip():
        raise ValueError("Search `query` must be a non-empty string")
    if req.limit < 1 or req.limit > 1000:
        raise ValueError("`limit` must be between 1 and 1000")
