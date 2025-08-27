import { useState, useEffect } from "react";
import DeleteConfirmationModal from "./delete-confirmation-modal";

interface ReqCollection {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

interface Requirement {
  id: number;
  req_collection_id: number;
  public_id: string;
  name: string;
  definition: string;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  version_number: number;
  created_at: string;
  parent_req_id?: number;
}

interface ReqCollectionDeletionPreview {
  req_collection: ReqCollection;
  requirements: Requirement[];
  requirements_count: number;
}

interface DeleteReqCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  reqCollection: ReqCollection | null;
  requirements: Requirement[];
  isLoading?: boolean;
}

const DeleteReqCollectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  reqCollection,
  requirements,
  isLoading = false
}: DeleteReqCollectionModalProps) => {
  const [deletionPreview, setDeletionPreview] = useState<{
    modules: any[];
    req_collections: any[];
    requirements_count: number;
  } | undefined>();

  useEffect(() => {
    if (isOpen && reqCollection) {
      // Filter requirements that belong to this req collection
      const relatedRequirements = requirements.filter(req => req.req_collection_id === reqCollection.id);
      
      // Create deletion preview data
      setDeletionPreview({
        modules: [], // Req collections don't directly contain modules
        req_collections: [], // We're not deleting other collections
        requirements_count: relatedRequirements.length
      });
    }
  }, [isOpen, reqCollection, requirements]);

  if (!reqCollection) {
    return null;
  }

  const relatedRequirements = requirements.filter(req => req.req_collection_id === reqCollection.id);
  
  const warningMessage = relatedRequirements.length > 0
    ? `This will permanently delete ${relatedRequirements.length} requirement${relatedRequirements.length !== 1 ? 's' : ''} that belong to this collection. All requirement data, including definitions, parameters, comments, and version history will be lost.`
    : "This collection contains no requirements and can be safely deleted.";

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      itemName={reqCollection.name}
      itemType="Requirements Collection"
      isLoading={isLoading}
      warningMessage={warningMessage}
      deletionPreview={deletionPreview}
      isLoadingPreview={false}
    />
  );
};

export default DeleteReqCollectionModal;