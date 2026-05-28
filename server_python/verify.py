from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "count" in data
    print("Health check: PASS")

def test_list_segments():
    response = client.get("/api/road-segments")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] > 0
    assert len(data["items"]) == data["count"]
    print("List segments: PASS")

def test_filter_segments():
    # Test CO2e filter
    response = client.get("/api/road-segments?minCo2e=200")
    assert response.status_code == 200
    data = response.json()
    assert all(item["emissionFactors"]["co2e"] >= 200 for item in data["items"])
    print("Filter segments: PASS")

def test_get_segment():
    response = client.get("/api/road-segments/seg_001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "seg_001"
    print("Get segment: PASS")

if __name__ == "__main__":
    try:
        test_health()
        test_list_segments()
        test_filter_segments()
        test_get_segment()
        print("ALL TESTS PASSED")
    except Exception as e:
        print(f"TEST FAILED: {e}")
        exit(1)
