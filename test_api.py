"""
Quick test script to verify API endpoints are working
"""
import requests

API_BASE = "http://localhost:5000/api"

def test_health():
    """Test health endpoint"""
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")

def test_voices():
    """Test voices endpoint"""
    print("\n2. Testing voices list...")
    try:
        response = requests.get(f"{API_BASE}/voices")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Found {len(data['voices'])} voices")
        for voice in data['voices']:
            print(f"   - {voice['name']} (ID: {voice['id']})")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("API Integration Test")
    print("=" * 60)
    
    test_health()
    test_voices()
    
    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)
