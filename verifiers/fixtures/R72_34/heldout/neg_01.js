function* idGenerator(prefix) {
  let n = 0;
  while (true) {
    n += 1;

    yield `${prefix}-${n}`;
  }
}

module.exports = { idGenerator };
