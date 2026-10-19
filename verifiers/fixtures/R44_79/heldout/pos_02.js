import React from "react";
import * as Gatsby from "gatsby";

export default function Pagination({ prev, next }) {
  return (
    <div className="pagination">
      {prev && <Gatsby.Link to={prev} rel="prev">Previous</Gatsby.Link>}
      {next && <Gatsby.Link to={next} rel="next">Next</Gatsby.Link>}
    </div>
  );
}
