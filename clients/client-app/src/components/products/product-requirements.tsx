import RequirementsViews from "../requirements/requirements-views";

interface ProductRequirementsProps {
  workspaceId: string;
  productId: number;
  className?: string;
}

const ProductRequirements = ({ 
  workspaceId, 
  productId, 
  className = "" 
}: ProductRequirementsProps) => {
  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Requirements
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage requirements across all modules associated with this product.
        </p>
      </div>
      
      <RequirementsViews 
        workspaceId={workspaceId}
        productId={productId}
      />
    </div>
  );
};

export default ProductRequirements;