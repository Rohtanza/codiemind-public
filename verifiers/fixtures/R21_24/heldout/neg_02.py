class Stack:
    items = None

    def push(self, item):
        """Push an item onto the stack.

        Args:
            item: The item to push.
        """
        if self.items is None:
            self.items = []
        self.items.append(item)
