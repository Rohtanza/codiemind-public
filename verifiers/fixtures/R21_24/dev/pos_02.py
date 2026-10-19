class Account:
    """A simple bank account holding a balance."""

    balance = 0.0

    def withdraw(self, amount: float) -> float:
        """Withdraw money from the account.

        Args:
            amount (float): The amount to withdraw.

        Returns:
            float: The remaining balance.

        Raises:
            ValueError: If the amount exceeds the balance.
        """
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount
        return self.balance
