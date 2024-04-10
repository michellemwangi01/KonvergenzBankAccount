import { deposit, withdraw } from "./script.js";

describe("Deposit Function", () => {
  test("Deposit function should return undefined when amount is within limits", async () => {
    const requestObj = {
      amount: 500,
      date: new Date().toISOString(),
      transaction_type: "deposit",
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ total: 1000, count: 2 }),
      })
    );

    await expect(deposit(requestObj)).resolves.toBeUndefined();
  });

  test("Deposit function should throw error when amount exceeds maximum per transaction limit", async () => {
    const requestObj = {
      amount: 1500,
      date: new Date().toISOString(),
      transaction_type: "deposit",
    };

    await expect(deposit(requestObj)).rejects.toThrow(
      "Your deposit exceeds the maximum transaction limit"
    );
  });
});

describe("Withdraw Function", () => {
  test("Withdraw function should return undefined when amount is within limits and sufficient balance", async () => {
    const requestObj = {
      amount: 200,
      date: new Date().toISOString(),
      transaction_type: "withdrawal",
    };

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ total: 800, count: 3 }),
      })
    );

    await expect(withdraw(requestObj)).resolves.toBeUndefined();
  });

  test("Withdraw function should throw error when amount exceeds maximum per transaction limit", async () => {
    const requestObj = {
      amount: 1000,
      date: new Date().toISOString(),
      transaction_type: "withdrawal",
    };

    await expect(withdraw(requestObj)).rejects.toThrow(
      "Your withdrawal exceeds the maximum withdrawal limit"
    );
  });
});
