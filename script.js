const local_json_db = `http://localhost:3000`;
const depositBtn = document.getElementById("deposit-button");
const getBalanceBtn = document.getElementById("get-balance");
const withdrawBtn = document.getElementById("withdraw-button");
let current_balance;
let transaction_limits;

const deposit_obj = {
  amount: 2000,
  date: new Date().toISOString(),
};
async function init() {
  try {
    transaction_limits = await get_limits();
    console.log(transaction_limits);
  } catch (error) {
    console.error("Error initializing app:", error.message);
  }
}

function get_balance() {
  fetch(`${local_json_db}/balance`)
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
    })
    .then((data) => {
      current_balance = data.amount;
      console.log(data);
    })
    .catch((error) => {
      console.error("Error message:", error.message);
    });
  return current_balance;
}

async function get_limits() {
  try {
    const response = await fetch(`${local_json_db}/limits`);
    if (!response.ok) {
      throw new Error(`ERROR! Status: ${response.status}`);
    }
    const data = await response.json();
    const limits = {
      max_deposit_amount_per_transaction: data.deposit.per_transaction,
      max_deposit_total_per_day: data.deposit.per_day,
      max_no_of_deposits_per_day: data.deposit.transaction_count_per_day,
      max_withdrawal_total_per_day: data.withdrawal.per_day,
      max_withdrawal_amount_per_transaction: data.withdrawal.per_transaction,
      max_no_of_withdrawals_per_day: data.withdrawal.transaction_count_per_day,
    };

    return limits;
  } catch (error) {
    console.error("Error fetching limits:", error.message);
    throw error;
  }
}

async function update_balance_and_transaction(deposit_obj) {
  const updateBalance = fetch(`${local_json_db}/balance`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: current_balance + deposit_obj.amount,
    }),
  }).then((res) => {
    console.log(res);
    if (res.ok) {
      return res.json();
    } else {
      throw new Error("Failed to update balance");
    }
  });

  const updateTransactions = fetch(`${local_json_db}/transactions`)
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error(
          `Error fetching transactions data. Status: ${res.status}`
        );
      }
    })
    .then((data) => {
      data = data;
      //   console.log(data);
      const lastDeposits = data.deposit.last_deposits;
      lastDeposits.push({ ID: lastDeposits.length + 1, ...deposit_obj });
      data.deposit.last_deposits = lastDeposits;
      data.deposit.total = data.deposit.total + deposit_obj.amount;
      data.deposit.count = data.deposit.count + 1;
      console.log(data);
      return fetch(`${local_json_db}/transactions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        console.log(res);
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Transatcion update failed");
        }
      });
    });

  return Promise.all([updateBalance, updateTransactions])
    .then(([updateBalanceResponse, updateTransactionsResponse]) => {
      console.log("Balance updated successfully:", updateBalanceResponse);
      console.log(
        "Transaction count updated successfully:",
        updateTransactionsResponse
      );
    })
    .catch((error) => {
      console.error("Did not upate balance and transaction", error.message);
    });
}

async function deposit(deposit_obj) {
  try {
    const response = await fetch(`${local_json_db}/transactions`);
    if (!response.ok) {
      throw new Error(`ERROR! Status: ${response.status}`);
    }
    const data = await response.json();
    const transactions_data = data.deposit;

    console.log(transactions_data);

    console.log(transaction_limits);

    console.log(deposit_obj);

    if (
      deposit_obj.amount > transaction_limits.max_deposit_amount_per_transaction
    ) {
      console.log(
        `Your deposit exceeds the maximum transaction limit which is Ksh ${transaction_limits.max_deposit_amount_per_transaction}`
      );
      return;
    }

    if (
      deposit_obj.amount + transactions_data.total >
      transaction_limits.max_deposit_total_per_day
    ) {
      console.log(
        `Your deposit exceeds the daily maximum deposit amount which is Ksh ${transaction_limits.max_deposit_total_per_day}`
      );
      return;
    }

    if (
      transactions_data.count + 1 >
      transaction_limits.max_no_of_deposits_per_day
    ) {
      console.log(
        `You have used up all your ${transaction_limits.max_no_of_deposits_per_day} deposits for the day.`
      );
      return;
    }

    await update_balance_and_transaction(deposit_obj);
    return;
  } catch (error) {
    console.error("Error in deposit function:", error.message);
    throw error;
  }
}

// ------------------------ UPDATE BALANCE & TRANSACTION ------------------------

document.addEventListener("DOMContentLoaded", () => {
  init();

  get_balance();
  depositBtn.addEventListener("click", (e) => {
    e.preventDefault();
    deposit(deposit_obj);
  });
  withdrawBtn.addEventListener("click", () => {
    withdraw();
  });
  getBalanceBtn.addEventListener("click", () => {
    get_balance();
  });
});
