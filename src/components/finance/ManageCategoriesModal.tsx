// src/components/finance/ManageCategoriesModal.tsx

import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal'; // Assuming Modal component is in '../ui/Modal'
import FormField from '../ui/FormField'; // Assuming FormField component is in '../ui/FormField'
import toast from 'react-hot-toast';
import financeCategoryService from '../../services/financeCategory.service'; // Import the service
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react'; // Added Plus icon

interface CategoryItem {
  id: string;
  name: string;
}

interface ManageCategoriesModalProps {
  onClose: () => void;
  // This callback is crucial to notify the parent (Finance.tsx) to refresh its categories state
  onCategoriesUpdated?: () => void; // Made optional
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ onClose, onCategoriesUpdated }) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // Track which category is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Fetch all categories using the service
  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Assuming financeCategoryService.getAll() returns an array of { id: string, name: string }
      const fetchedCategories = await financeCategoryService.getAll();
      // Ensure data structure matches CategoryItem and sort alphabetically
      const cats: CategoryItem[] = fetchedCategories.map(c => ({ id: c.id, name: c.name }));
      cats.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []); // Fetch categories on component mount

  // Add a new category using the service
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    // Prevent duplicates (case-insensitive)
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That category already exists');
      return;
    }

    setLoading(true);
    try {
      // Corrected: Use financeCategoryService.create instead of .add
      const addedCategory = await financeCategoryService.create({ name: trimmed });
      setCategories((prev) => {
        const updated = [...prev, addedCategory];
        updated.sort((a, b) => a.name.localeCompare(b.name));
        return updated;
      });
      setNewCategory('');
      toast.success(`Added category "${trimmed}"`);
      onCategoriesUpdated?.(); // Safely call if exists
    } catch (err) {
      console.error('Error adding category:', err);
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  // Delete a category by its ID using the service
  const handleDeleteCategory = async (catId: string, catName: string) => {
    // Using a custom modal for confirmation instead of window.confirm
    // For simplicity here, I'll use a basic alert, but you should replace with your Modal component
    if (!window.confirm(`Are you sure you want to delete "${catName}"? This cannot be undone.`)) {
        return;
    }

    setLoading(true);
    try {
      // Corrected: financeCategoryService.delete is correct as per service default export alias
      await financeCategoryService.delete(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      toast.success(`Deleted category "${catName}"`);
      // If we were editing this item, cancel edit
      if (editingId === catId) {
        setEditingId(null);
        setEditingName('');
      }
      onCategoriesUpdated?.(); // Safely call if exists
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Start editing: populate editingName and set editingId
  const handleStartEdit = (catId: string, currentName: string) => {
    setEditingId(catId);
    setEditingName(currentName);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save edited name to Firestore using the service
  const handleSaveEdit = async () => {
    if (!editingId) return;

    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    // Prevent duplicates of other categories (case-insensitive)
    if (
      categories.some(
        (c) =>
          c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.error('Another category with that name already exists');
      return;
    }

    setLoading(true);
    try {
      await financeCategoryService.update(editingId, { name: trimmed });
      // Update local state
      setCategories((prev) => {
        const updated = prev.map((c) =>
          c.id === editingId ? { ...c, name: trimmed } : c
        );
        updated.sort((a, b) => a.name.localeCompare(b.name));
        return updated;
      });
      toast.success(`Renamed category to "${trimmed}"`);
      setEditingId(null);
      setEditingName('');
      onCategoriesUpdated?.(); // Safely call if exists
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6"> {/* Added p-6 for consistent padding */}
      {/* Add New Category */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Add New Category</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }} className="flex space-x-2">
          <FormField
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter new category name"
            disabled={loading}
            className="flex-grow"
          />
          <button
            type="submit"
            disabled={loading || !newCategory.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 flex items-center"
          >
            <Plus className="w-5 h-5 mr-1" /> Add
          </button>
        </form>
      </div>

      {/* Existing Categories List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Existing Categories</h2>
        {loading ? (
          <div className="text-gray-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-500">No categories yet.</div>
        ) : (
          <ul className="max-h-60 overflow-y-auto border rounded-md p-2 bg-gray-50">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;
              return (
                <li
                  key={cat.id}
                  className="py-2 px-3 flex items-center justify-between bg-white rounded-md shadow-sm mb-2 last:mb-0"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 form-input rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        disabled={loading}
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        title="Save"
                        className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        title="Cancel"
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{cat.name}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(cat.id, cat.name)}
                          disabled={loading}
                          title="Edit category"
                          className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={loading}
                          title="Delete category"
                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;
