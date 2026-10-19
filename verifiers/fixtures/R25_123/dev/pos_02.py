class Account:
    def __init__(self, owner: str, balance: float = 0.0) -> None:
        self.owner = owner
        self.balance = balance

    def deposit(self, amount: float) -> float:
        self.balance += amount
        return self.balance

    @classmethod
    def empty(cls, owner: str) -> "Account":
        return cls(owner)
