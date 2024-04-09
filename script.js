const local_json_db = `http://localhost:3000`;
const depositBtn = document.getElementById("deposit-button");
const getBalanceBtn = document.getElementById("get-balance");
const withdrawBtn = document.getElementById("withdraw-button");
let current_balance;
let transaction_limits;

async function init() {
  try {
    transaction_limits = await get_limits();
    get_balance();
    console.log(transaction_limits);
  } catch (error) {
    console.error("Error initializing app:", error.message);
  }
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

    console.log("Limits fetched:", limits);
    return limits;
  } catch (error) {
    console.error("Error fetching limits:", error.message);
    throw error;
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

async function update_balance_and_transaction() {
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

function deposit() {
  deposit_obj = {
    amount: 1200,
    date: new Date().toISOString(),
  };
  console.log(transaction_limits);
  try {
    fetch(`${local_json_db}/transactions`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error(`ERROR! Status: ${res.status}`);
        }
      })
      .then((data) => {
        const transactions_data = {
          number_of_transactions: data.deposit.count,
          total_amount_transacted: data.deposit.total,
        };

        if (
          deposit_obj.amount >
          transaction_limits.max_deposit_amount_per_transaction
        ) {
          console.log(
            `Your deposit exceeds the maximum transaction limit which is Ksh ${transaction_limits.max_deposit_amount_per_transaction}`
          );
        }

        if (
          deposit_obj.amount + transactions_data.total_amount_transacted >
          transaction_limits.max_deposit_total_per_day
        ) {
          console.log(
            `Your deposit exceeds the daily maximum deposit amount which is Ksh ${transaction_limits.max_deposit_total_per_day}`
          );
        }

        if (
          transactions_data.number_of_transactions + 1 >
          transaction_limits.max_no_of_deposits_per_day
        ) {
          console.log(
            `You have used up all your ${transaction_limits.max_no_of_deposits_per_day} deposits for the day.`
          );
        }

        update_balance_and_transaction();
      })
      .catch((error) => {
        console.error("Error fetching data:", error.message);
        throw error;
      });
  } catch (error) {
    console.error("Error in try-catch block:", error.message);
    throw error;
  }
}

// ------------------------ UPDATE BALANCE & TRANSACTION ------------------------

document.addEventListener("DOMContentLoaded", () => {
  init();

  depositBtn.addEventListener("click", (e) => {
    deposit();
    e.preventDefault();
  });
  withdrawBtn.addEventListener("click", () => {
    withdraw();
  });
  getBalanceBtn.addEventListener("click", () => {
    get_balance();
  });
});

// function uupdate_transaction() {
//   deposit_obj = {
//     amount: 1200,
//     date: new Date().toISOString(),
//   };
//   fetch(`${local_json_db}/transactions`)
//     .then((res) => {
//       if (res.ok) {
//         return res.json();
//       } else {
//         throw new Error(
//           `Error fetching transactions data. Status: ${res.status}`
//         );
//       }
//     })
//     .then((data) => {
//       data = data.deposit;
//       //   console.log(data);
//       const lastDeposits = data.last_deposits;
//       lastDeposits.push({ ID: lastDeposits.length + 1, ...deposit_obj });
//       data.last_deposits = lastDeposits;
//       data.total = data.total + deposit_obj.amount;
//       data.count = data.count + 1;
//       console.log(data);
//       return fetch(`${local_json_db}/transactions`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(data),
//       }).then((res) => {
//         console.log(res);
//         if (res.ok) {
//           return res.json();
//         } else {
//           throw new Error("Transatcion update failed");
//         }
//       });
//     });
// }
