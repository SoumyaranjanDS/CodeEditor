from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_python_run_returns_stdout() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "python",
            "code": "print(input()[::-1])",
            "stdin": "aura",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["stdout"].strip() == "arua"
    assert payload["exit_code"] == 0


def test_cpp_run_returns_stdout() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "cpp",
            "code": """
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cin >> name;
    cout << "Hello, " << name << endl;
    return 0;
}
""",
            "stdin": "Soumy",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert "Hello, Soumy" in payload["stdout"]
    assert payload["exit_code"] == 0


def test_c_run_returns_stdout() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "c",
            "code": """
#include <stdio.h>

int main() {
    char name[100];
    scanf("%99s", name);
    printf("Hello, %s\\n", name);
    return 0;
}
""",
            "stdin": "Soumy",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert "Hello, Soumy" in payload["stdout"]
    assert payload["exit_code"] == 0


def test_java_run_returns_stdout() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "java",
            "code": """
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        System.out.println("Hello, " + name);
    }
}
""",
            "stdin": "Soumy",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert "Hello, Soumy" in payload["stdout"]
    assert payload["exit_code"] == 0


def test_cpp_compile_error_returns_error() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "cpp",
            "code": "int main( { return 0; }",
            "stdin": "",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["stderr"]


def test_c_compile_error_returns_error() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "c",
            "code": "int main( { return 0; }",
            "stdin": "",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["stderr"]


def test_java_compile_error_returns_error() -> None:
    response = client.post(
        "/api/run",
        json={
            "language": "java",
            "code": "public class Main { public static void main(String[] args) { System.out.println( } }",
            "stdin": "",
            "mode": "normal",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["stderr"]
