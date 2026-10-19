function sumColumn(rows, columnKey) {
  let total = 0;
  for (let row_index = 0; row_index < rows.length; row_index++) {
    total += Number(rows[row_index][columnKey]) || 0;
  }
  return total;
}

export default sumColumn;
