import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setProducts,
  addProduct,
  setLoading,
  setError,
  clearProducts,
} from "../store/products/products.slice";
import {
  selectProducts,
  selectProductsLoading,
  selectProductsError,
} from "../store/products/products.selectors";
import { selectSelectedWorkspace } from "../store/workspaces/workspaces.selectors";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";

interface Product {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const ProductsView = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();
  
  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);
  const workspace = useAppSelector(selectSelectedWorkspace);
  
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWorkspaceDetails(response.data.data);
    } catch (err: any) {
      console.error("Error fetching workspace:", err);
    }
  };

  const fetchProducts = async () => {
    if (!workspaceId) return;
    
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/products`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(setProducts(response.data.data?.items || response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching products:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch products"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const createProduct = async () => {
    if (!workspaceId) return;

    const name = prompt("Enter product name:");
    if (!name) return;

    const description = prompt("Enter product description (optional):") || "";

    try {
      const token = await getToken({ template: "default" });
      
      const response = await axios.post(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/products`,
        {
          name,
          description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      dispatch(addProduct(response.data.data));
    } catch (err: any) {
      console.error("Error creating product:", err);
      alert(err.response?.data?.message || "Failed to create product");
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
      fetchProducts();
    }
    
    return () => {
      dispatch(clearProducts());
    };
  }, [workspaceId, dispatch]);

  const getBgColorFromId = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            {(workspace || workspaceDetails)?.description && (
              <p className="text-gray-600 mt-1">{(workspace || workspaceDetails)!.description}</p>
            )}
          </div>
          <div>
            <button
              onClick={createProduct}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Product
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Products ({products.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="py-6">
              <ErrorMessage 
                title="Failed to load products"
                message={error}
                onRetry={fetchProducts}
              />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="mx-auto h-12 w-12 text-gray-400"
              >
                <path
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No products</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first product.
              </p>
              <div className="mt-6">
                <button
                  onClick={createProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  New Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => {
                    // TODO: Navigate to product details or requirements filtered by product
                    console.log("Navigate to product:", product.id);
                  }}
                >
                  <div className="flex">
                    <div className={`w-1 ${getBgColorFromId(product.id)} flex-shrink-0`} />
                    <div className="p-4 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <p className="text-gray-400 dark:text-gray-500 text-xs">
                        Created: {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsView;