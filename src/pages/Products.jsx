import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Package, Plus, Search, Edit2, Trash2, X } from 'lucide-react';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Form states
  const [productForm, setProductForm] = useState({ name: '', purchasePrice: '', sellingPrice: '' });

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  // Handlers
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', purchasePrice: '', sellingPrice: '' });
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({ 
      name: product.name, 
      purchasePrice: product.purchasePrice || product.purchase_price || product.price || '', 
      sellingPrice: product.sellingPrice || product.selling_price || product.price || ''
    });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    const productData = {
      name: productForm.name,
      purchasePrice: parseFloat(productForm.purchasePrice) || 0,
      sellingPrice: parseFloat(productForm.sellingPrice) || 0,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setIsProductModalOpen(false);
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-8 animate-in fade-in flex flex-col relative min-h-0 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Items
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage your product catalogue</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus size={20} /> New Item
        </button>
      </div>

      {/* Search */}
      <div className="search-wrapper bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
        <Search size={20} className="search-icon text-slate-400 flex-shrink-0" />
        <input 
          type="text" 
          placeholder="Search items..." 
          className="search-input flex-1 py-1.5 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-transparent pl-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 h-full custom-scrollbar">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="bg-slate-50 p-6 rounded-full mb-5 text-slate-300">
                <Package size={48} />
              </div>
              <p className="font-black text-slate-700 text-xl mb-2">No Items Yet</p>
              <p className="text-slate-500 text-sm mb-6 font-medium">Add your first item to your catalogue.</p>
              <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                <Plus size={18} /> Add First Item
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center h-full">
              <Search size={40} className="text-slate-300 mb-4" />
              <p className="font-bold text-slate-600">No items match "{searchTerm}"</p>
            </div>
          ) : (
            <div className="table-wrapper">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Item Name</th>
                  <th className="py-4 px-6 text-right">Purchase Price</th>
                  <th className="py-4 px-6 text-right">Sale Price</th>
                  <th className="py-4 px-6 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredProducts.map((product) => {
                  const sellingPrice = parseFloat(product.sellingPrice || product.selling_price || product.price || 0);
                  const purchasePrice = parseFloat(product.purchasePrice || product.purchase_price || 0);

                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 text-[15px]">{product.name}</p>
                        {product.hsn && <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">HSN: {product.hsn}</p>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-medium text-slate-500">₹{purchasePrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-black text-slate-800 text-[15px]">₹{sellingPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(product); }} 
                            className="p-2 text-slate-400 hover:bg-white hover:text-indigo-600 rounded-lg transition-all active:scale-95 shadow-sm border border-transparent hover:border-indigo-100" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this item?')) deleteProduct(product.id); }} 
                            className="p-2 text-slate-400 hover:bg-white hover:text-red-500 rounded-lg transition-all active:scale-95 shadow-sm border border-transparent hover:border-red-100" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-slate-100 flex flex-col">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300"></div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-slate-800">
              <h3 className="text-lg font-black flex items-center gap-2">
                {editingProduct ? <Edit2 size={18} className="text-indigo-600" /> : <Plus size={18} className="text-indigo-600" />}
                {editingProduct ? 'Edit Item' : 'New Item'}
              </h3>
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Item Name *</label>
                <input 
                  type="text" required autoFocus
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all"
                  placeholder="e.g. Cotton Shirt"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Purchase Price</label>
                  <input 
                    type="number" min="0" step="0.01"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Sale Price *</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-800 font-bold shadow-inner"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-[0.5] py-3.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors active:scale-95 text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-sm">
                  {editingProduct ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
