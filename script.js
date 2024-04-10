const local_json_db = `http://localhost:3000`;
const depositBtn = document.getElementById("deposit-button");
const getBalanceBtn = document.getElementById("get_balance_btn");
const withdrawBtn = document.getElementById("withdraw-button");
const resetCountsBtn = document.getElementById("resetCountsBtn");
const create_account = document.getElementById("create_account");
const account_page = document.getElementById("account_page");
const landing_page = document.getElementById("landing_page");
const deposit_service = document.getElementById("deposit_service");
const withdraw_service = document.getElementById("withdraw_service");
const deposit_form = document.getElementById("makeADeposit");
const create_user_form = document.getElementById("create_user_form");
const withdrawal_form = document.getElementById("makeAWithdrawal");
const withdrawalForm = document.getElementById("makeAWithdrawal");
const withdrawAmountInput = document.getElementById("withdrawAmountInput");
const depositForm = document.getElementById("makeADeposit");
const depositAmountInput = document.getElementById("depositAmountInput");
let current_balance;
let transaction_limits;
let username;

async function init() {
  try {
    transaction_limits = await get_limits();
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
    console.log(data);
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

async function update_balance_and_transaction(request_obj) {
  const requestBody = {
    amount:
      request_obj.transaction_type === "withdrawal"
        ? current_balance - request_obj.amount
        : current_balance + request_obj.amount,
  };
  const endpoint = request_obj.transaction_type;

  const updateBalance = fetch(`${local_json_db}/balance`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: requestBody.amount,
    }),
  }).then((res) => {
    console.log(res);
    if (res.ok) {
      return res.json();
    } else {
      throw new Error("Failed to update balance");
    }
  });

  const updateTransactions = fetch(`${local_json_db}/${endpoint}`)
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
      if (request_obj.transaction_type == "deposit") {
        const lastDeposits = data.last_deposits;
        lastDeposits.push({ ID: lastDeposits.length + 1, ...request_obj });
        data.last_deposits = lastDeposits;
        data.total = data.total + request_obj.amount;
        data.count = data.count + 1;
      }

      if (request_obj.transaction_type == "withdrawal") {
        const lastWithdrawals = data.last_withdrawals;
        lastWithdrawals.push({
          ID: lastWithdrawals.length + 1,
          ...request_obj,
        });
        data.last_withdrawals = lastWithdrawals;
        data.total = data.total + request_obj.amount;
        data.count = data.count + 1;
      }

      console.log(data);
      return fetch(`${local_json_db}/${endpoint}`, {
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
      localStorage.setItem(
        "notificationMessage",
        `SUCCESS! Your ${request_obj.transaction_type} has been successfully completed.`
      );
      displaySuccessNotification("SUccess");
    })
    .catch((error) => {
      console.error("Did not upate balance and transaction", error.status);
    });
}

async function deposit(request_obj) {
  try {
    const response = await fetch(`${local_json_db}/deposit`);
    if (!response.ok) {
      throw new Error(`ERROR! Status: ${response.status}`);
    }
    const data = await response.json();
    const transactions_data = data;

    if (
      request_obj.amount > transaction_limits.max_deposit_amount_per_transaction
    ) {
      displayErrorNotification(
        `ERROR! Your deposit exceeds the maximum transaction limit which is KES ${transaction_limits.max_deposit_amount_per_transaction.toLocaleString()}.`
      );
      return;
    }

    if (
      request_obj.amount + transactions_data.total >
      transaction_limits.max_deposit_total_per_day
    ) {
      displayErrorNotification(
        `ERROR! Your deposit exceeds the daily maximum deposit amount which is KES ${transaction_limits.max_deposit_total_per_day.toLocaleString()}.`
      );
      return;
    }

    if (
      transactions_data.count + 1 >
      transaction_limits.max_no_of_deposits_per_day
    ) {
      displayErrorNotification(
        `ERROR! You have used up all your ${transaction_limits.max_no_of_deposits_per_day} deposits for the day.`
      );
      return;
    }

    await update_balance_and_transaction(request_obj);

    return;
  } catch (error) {
    console.error("Error in deposit function:", error.message);
    throw error;
  }
}

async function withdraw(request_obj) {
  try {
    const response = await fetch(`${local_json_db}/withdrawal`);
    if (!response.ok) {
      throw new Error(`ERROR! Status: ${response.status}`);
    }
    const data = await response.json();
    const transactions_data = data;

    if (
      request_obj.amount >
      transaction_limits.max_withdrawal_amount_per_transaction
    ) {
      displayErrorNotification(
        `ERROR! Your withdrawal exceeds the maximum withdrawal limit which is KES ${transaction_limits.max_withdrawal_amount_per_transaction.toLocaleString()}.`
      );
      return;
    }

    if (
      request_obj.amount + transactions_data.total >
      transaction_limits.max_withdrawal_total_per_day
    ) {
      displayErrorNotification(
        `ERROR! Your withdrawal exceeds the daily maximum amount which is KES ${transaction_limits.max_withdrawal_total_per_day.toLocaleString()}.`
      );
      return;
    }

    if (
      transactions_data.count + 1 >
      transaction_limits.max_no_of_withdrawals_per_day
    ) {
      displayErrorNotification(
        `ERROR! You have used up all your ${transaction_limits.max_no_of_withdrawals_per_day} withdrawals for the day.`
      );
      return;
    }

    if (request_obj.amount > current_balance) {
      displayErrorNotification(
        `ERROR! You do not have enough balance to withdraw Ksk${request_obj.amount}.`
      );
      return;
    }
    await update_balance_and_transaction(request_obj);
    return;
  } catch (error) {
    console.error("Error in deposit function:", error.message);
    throw error;
  }
}

function displayErrorNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.classList.add("error_notification");
  notificationDiv.textContent = message;

  const notificationContainer = document.getElementById(
    "notificationContainer"
  );
  notificationContainer.appendChild(notificationDiv);

  setTimeout(() => {
    notificationDiv.remove();
  }, 7000);
}

function displaySuccessNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.classList.add("success_notification");
  notificationDiv.textContent = message;

  const notificationContainer = document.getElementById(
    "notificationContainer"
  );
  notificationContainer.appendChild(notificationDiv);

  setTimeout(() => {
    notificationDiv.remove();
  }, 7000);
}

async function reset_counts() {
  try {
    // Reset deposit count
    const response1 = await fetch(`${local_json_db}/deposit`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count: 0 }),
    });

    if (!response1.ok) {
      throw new Error("Reset deposit count failed");
    }

    // Reset withdrawal count
    const response2 = await fetch(`${local_json_db}/withdrawal`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count: 0 }),
    });

    if (!response2.ok) {
      throw new Error("Reset withdrawal count failed");
    }

    console.log("Counts reset successfully");
    return true;
  } catch (error) {
    console.error("Error resetting counts:", error.message);
    return false;
  }
}

// ------------------------ INITIALIZE APP ------------------------

document.addEventListener("DOMContentLoaded", () => {
  init();
  get_balance();

  create_account.addEventListener("click", () => {
    if (localStorage.getItem("username") === null) {
      create_user_form.style.display = "block";
    } else {
      create_user_form.style.display = "none";
    }
  });

  create_user_form.addEventListener("submit", (e) => {
    e.preventDefault();
    username = document.getElementById("username_input").value;
    document.getElementById("welcome_info").innerText = `Welcome, ${username}`;
    document.getElementById("username_detail").innerText = `${username}`;
    localStorage.setItem("username", username);
  });

  deposit_service.addEventListener("click", () => {
    if (deposit_form.style.display === "none") {
      deposit_form.style.display = "block";
      withdrawal_form.style.display = "none";
    } else {
      deposit_form.style.display = "none";
    }
  });

  withdraw_service.addEventListener("click", () => {
    if (withdrawal_form.style.display === "none") {
      withdrawal_form.style.display = "block";
      deposit_form.style.display = "none";
    } else {
      withdrawal_form.style.display = "none";
    }
  });

  withdrawalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const request_obj = {
      amount: parseInt(withdrawAmountInput.value),
      date: new Date().toISOString(),
      transaction_type: "withdrawal",
    };
    console.log(request_obj);
    withdraw(request_obj);
  });

  depositForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const request_obj = {
      amount: parseInt(depositAmountInput.value),
      date: new Date().toISOString(),
      transaction_type: "deposit",
    };
    console.log(request_obj);
    deposit(request_obj);
  });

  getBalanceBtn.addEventListener("click", () => {
    const balance_value = document.getElementById("balance_value");
    const balance = get_balance();
    const formattedBalance = balance.toLocaleString("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    balance_value.innerText = `${formattedBalance}`;
  });

  resetCountsBtn.addEventListener("click", () => {
    reset_counts()
      .then((success) => {
        if (success) {
          console.log("Reset successfully");
        } else {
          console.log("Reset Failed");
        }
      })
      .catch((error) => {
        console.error("Error occurred during count reset:", error);
      });
  });
  const notificationMessage = localStorage.getItem("notificationMessage");

  if (notificationMessage) {
    displaySuccessNotification(notificationMessage);
    localStorage.removeItem("notificationMessage");
  }
});
