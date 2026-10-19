import { useNavigate, useParams } from "react-router-dom";

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Product {productId}</h1>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(`/products/${productId}/edit`)}>Edit</button>
    </div>
  );
}
