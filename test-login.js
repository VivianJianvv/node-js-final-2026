const request = require("supertest");

const api = () => request("http://localhost:8080");

async function test() {
  try {
    // 先註冊
    const signupRes = await api()
      .post("/api/users/signup")
      .send({
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        password: "Aa12345678",
      });

    console.log("Signup response:", signupRes.status, signupRes.body);

    if (signupRes.status !== 201) {
      console.log("Signup failed");
      return;
    }

    // 然後登入
    const loginRes = await api()
      .post("/api/users/login")
      .send({
        email: signupRes.body.data.user.email,
        password: "Aa12345678",
      });

    console.log("Login response:", loginRes.status, loginRes.body);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();
