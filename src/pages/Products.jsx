import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Package, Plus, Search, Edit2, Trash2, X, ArchiveRestore, AlertCircle } from 'lucide-react';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, addStock } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
  const [stockForm, setStockForm] = useState({ qtyChange: '', note: '' });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.quantity < 5).length;

  // Handlers
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({ 
      name: product.name, 
      purchasePrice: product.purchasePrice || product.price || '', 
      sellingPrice: product.sellingPrice || product.price || '', 
      quantity: product.quantity 
    });
    setIsProductModalOpen(true);
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockForm({ qtyChange: '', note: 'Manual Stock In' });
    setIsStockModalOpen(true);
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    const productData = {
      name: productForm.name,
      purchasePrice: parseFloat(productForm.purchasePrice),
      sellingPrice: parseFloat(productForm.sellingPrice),
      quantity: parseInt(productForm.quantity, 10)
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setIsProductModalOpen(false);
  };

  const handleStockSubmit = (e) => {
    e.preventDefault();
    if (!stockProduct || !stockForm.qtyChange) return;
    addStock(stockProduct.id, stockForm.qtyChange, stockForm.note);
    setIsStockModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            Products & Inventory 
            {lowStockCount > 0 && (
               <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
                 <AlertCircle size={14} /> {lowStockCount} Low Stock
               </span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage your catalogue, prices, and stock levels.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search products by name..." 
          className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Product List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                <Package size={32} />
              </div>
              <p className="font-medium text-slate-600 text-lg">No products found</p>
              <p className="text-sm mt-1 mb-4">Add your first product to start tracking inventory.</p>
              <button onClick={openAddModal} className="text-indigo-600 font-medium hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">Add Product</button>
            </div>
          ) : filteredProducts.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
                <p>No products match your search.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-sm uppercase font-semibold">
                  <th className="py-4 px-6">Product Name</th>
                  <th className="py-4 px-6 text-right">Purchase Price</th>
                  <th className="py-4 px-6 text-right">Selling Price</th>
                  <th className="py-4 px-6 text-center">Stock</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                     <td className="py-4 px-6 text-slate-800 font-bold">{product.name}</td>
                     <td className="py-4 px-6 text-slate-600 font-medium text-right">
                       ₹{parseFloat(product.purchasePrice || 0).toFixed(2)}
                     </td>
                     <td className="py-4 px-6 text-indigo-700 font-bold text-right">
                       ₹{parseFloat(product.sellingPrice || product.price || 0).toFixed(2)}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 rounded-md text-sm font-bold ${product.quantity < 5 ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm' : 'bg-emerald-50 text-emerald-700'}`}>
                          {product.quantity}
                        </span>
                     </td>
                     <td className="py-4 px-6 text-right space-x-1.5 flex justify-end">
                        <button onClick={() => openStockModal(product)} className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-lg transition-all" title="Stock In">
                          <ArchiveRestore size={18} />
                        </button>
                        <button onClick={() => openEditModal(product)} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors border border-transparent" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent" title="Delete">
                          <Trash2 size={18} />
                        </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD/EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {editingProduct ? <Edit2 size={18} className="text-indigo-600" /> : <Plus size={18} className="text-indigo-600" />}
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
                <input 
                  type="text" required
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800"
                  placeholder="e.g. Wireless Mouse"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Price (₹)</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Selling Price (₹)</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-800 font-bold shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="w-full">
                 <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Stock Quantity</label>
                 <input 
                   type="number" required min="0"
                   value={productForm.quantity}
                   onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                   disabled={!!editingProduct} // Disable editing stock directly when editing product to enforce stock-in history
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                   placeholder="0"
                 />
                 {editingProduct && <p className="text-xs text-slate-400 mt-1">To change stock, use the "Stock In" button on the grid.</p>}
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK IN MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <ArchiveRestore size={18} className="text-indigo-600" />
                Stock In Entry
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStockSubmit} className="p-6 space-y-4 text-left">
              <div>
                <p className="text-sm text-slate-500">Product</p>
                <p className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2 mb-2">{stockProduct?.name}</p>
                <p className="text-xs text-slate-500">Current Stock: <span className="font-bold text-slate-700">{stockProduct?.quantity}</span></p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Add Quantity</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-2.5 text-slate-500 font-bold">+</span>
                  <input 
                    type="number" required min="1"
                    value={stockForm.qtyChange}
                    onChange={(e) => setStockForm({...stockForm, qtyChange: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-800 text-lg font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note  (Optional)</label>
                <input 
                  type="text" 
                  value={stockForm.note}
                  onChange={(e) => setStockForm({...stockForm, note: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-700"
                  placeholder="e.g. Replenishment delivery"
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2">
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
