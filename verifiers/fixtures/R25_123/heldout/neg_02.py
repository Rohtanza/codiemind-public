class Temperature:
    def __init__(self, celsius: float) -> None:
        self.celsius = celsius

    @staticmethod
    def from_fahrenheit(fahrenheit) -> "Temperature":
        return Temperature((fahrenheit - 32) * 5 / 9)
