import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Package, Plus, Search, Edit2, Trash2, X, ArchiveRestore, AlertCircle, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, addStock } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockType, setStockType] = useState('IN'); // 'IN' or 'OUT'

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', purchasePrice: '', sellingPrice: '', quantity: '', lowStockThreshold: 5 });
  const [stockForm, setStockForm] = useState({ qtyChange: '', note: '' });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.quantity <= (p.lowStockThreshold || 5)).length;

  // Handlers
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', purchasePrice: '', sellingPrice: '', quantity: '', lowStockThreshold: 5 });
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({ 
      name: product.name, 
      purchasePrice: product.purchasePrice || product.price || '', 
      sellingPrice: product.sellingPrice || product.price || '', 
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold || 5
    });
    setIsProductModalOpen(true);
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockType('IN');
    setStockForm({ qtyChange: '', note: 'Manual Adjustment' });
    setIsStockModalOpen(true);
  };

  const openHistoryModal = (product) => {
    setHistoryProduct(product);
    setIsHistoryModalOpen(true);
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    const productData = {
      name: productForm.name,
      purchasePrice: parseFloat(productForm.purchasePrice) || 0,
      sellingPrice: parseFloat(productForm.sellingPrice) || 0,
      quantity: parseInt(productForm.quantity, 10) || 0,
      lowStockThreshold: parseInt(productForm.lowStockThreshold, 10) || 5
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct({
         ...productData,
         stockHistory: [{
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            change: productData.quantity,
            note: 'Initial Stock',
            type: 'IN'
         }]
      });
    }
    setIsProductModalOpen(false);
  };

  const handleStockSubmit = (e) => {
    e.preventDefault();
    if (!stockProduct || !stockForm.qtyChange) return;
    
    let change = parseInt(stockForm.qtyChange, 10);
    if (stockType === 'OUT') change = -change;
    
    addStock(stockProduct.id, change, stockForm.note);
    setIsStockModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            Products & Inventory 
            {lowStockCount > 0 && (
               <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                 <AlertCircle size={14} /> {lowStockCount} Low Stock Alert
               </span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage catalogue, set thresholds, and adjust inventory.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search products by name..." 
          className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-400">
                <Package size={40} />
              </div>
              <p className="font-bold text-slate-700 text-xl">No products matched</p>
              <p className="text-sm mt-2 mb-5">Add products to track inventory and create bills.</p>
              <button onClick={openAddModal} className="text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-xl transition-colors">Add First Product</button>
            </div>
          ) : filteredProducts.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 font-medium">
                <p>No products match "{searchTerm}".</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Product Name</th>
                  <th className="py-4 px-6 text-right">Purchase (₹)</th>
                  <th className="py-4 px-6 text-right">Selling (₹)</th>
                  <th className="py-4 px-6 text-center">Stock Limit</th>
                  <th className="py-4 px-6 text-center">Avail. Stock</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isLowStock = product.quantity <= (product.lowStockThreshold || 5);
                  return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                     <td className="py-4 px-6 text-slate-800 font-bold">{product.name}</td>
                     <td className="py-4 px-6 text-slate-600 font-medium text-right">
                       ₹{parseFloat(product.purchasePrice || 0).toFixed(2)}
                     </td>
                     <td className="py-4 px-6 text-indigo-700 font-bold text-right">
                       ₹{parseFloat(product.sellingPrice || product.price || 0).toFixed(2)}
                     </td>
                     <td className="py-4 px-6 text-center text-slate-500 text-sm font-medium">
                        Min {product.lowStockThreshold || 5}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-black ${isLowStock ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm' : 'bg-emerald-50 text-emerald-700'}`}>
                          {product.quantity}
                        </span>
                     </td>
                     <td className="py-4 px-6 text-right space-x-1.5 flex justify-end">
                        <button onClick={() => openHistoryModal(product)} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors border border-transparent" title="Stock History">
                          <History size={18} />
                        </button>
                        <button onClick={() => openStockModal(product)} className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm" title="Adjust Stock">
                          <ArchiveRestore size={18} />
                        </button>
                        <button onClick={() => openEditModal(product)} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors border border-transparent" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => { if(window.confirm('Delete this product?')) deleteProduct(product.id) }} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent" title="Delete">
                          <Trash2 size={18} />
                        </button>
                     </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD/EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {editingProduct ? <Edit2 size={18} className="text-indigo-600" /> : <Plus size={18} className="text-indigo-600" />}
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Name</label>
                <input 
                  type="text" required
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all"
                  placeholder="e.g. Wireless Mouse"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Purchase Price (₹)</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Selling Price (₹)</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-800 font-bold shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="w-full">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Initial Stock Qty</label>
                    <input 
                      type="number" required min="0"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                      disabled={!!editingProduct} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      placeholder="0"
                    />
                 </div>
                 <div className="w-full">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Low Stock Alert At</label>
                    <input 
                      type="number" required min="0"
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm({...productForm, lowStockThreshold: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                      placeholder="5"
                    />
                 </div>
              </div>
              {editingProduct && <p className="text-xs text-slate-500 text-center font-medium mt-2 bg-slate-50 p-2 rounded-lg">To change stock quantities, use the "Adjust Stock" action.</p>}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArchiveRestore size={18} className="text-indigo-600" /> Adjust Stock
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStockSubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Product</p>
                <p className="font-bold text-slate-900 text-xl">{stockProduct?.name}</p>
                <div className="mt-3 flex justify-center items-center gap-2">
                   <span className="text-xs font-bold text-slate-500 uppercase">Current Stock:</span>
                   <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-black text-slate-800">{stockProduct?.quantity}</span>
                </div>
              </div>
              
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                 <button type="button" onClick={() => setStockType('IN')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${stockType === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ArrowUpCircle size={16} /> Stock IN
                 </button>
                 <button type="button" onClick={() => setStockType('OUT')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all ${stockType === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ArrowDownCircle size={16} /> Stock OUT
                 </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Adjustment Quantity</label>
                <div className="flex items-center">
                  <span className={`border border-r-0 rounded-l-xl px-4 py-3 select-none ${stockType === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                     <span className="text-lg font-black">{stockType === 'IN' ? '+' : '-'}</span>
                  </span>
                  <input 
                    type="number" required min="1"
                    value={stockForm.qtyChange}
                    onChange={(e) => setStockForm({...stockForm, qtyChange: e.target.value})}
                    className={`w-full px-4 py-3 rounded-r-xl border focus:ring-2 focus:outline-none text-slate-800 text-lg font-black transition-colors ${stockType === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20' : 'border-red-200 focus:border-red-500 focus:ring-red-500/20'}`}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Reason / Note</label>
                <input 
                  type="text" required
                  value={stockForm.note}
                  onChange={(e) => setStockForm({...stockForm, note: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-700 font-medium"
                  placeholder={stockType === 'IN' ? 'e.g. Replenishment' : 'e.g. Damage / Return'}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${stockType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'}`}>
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK HISTORY MODAL */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-indigo-600" /> Stock History
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-white flex-shrink-0 border-b border-slate-100">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
               <h4 className="text-2xl font-black text-slate-800">{historyProduct.name}</h4>
               <p className="text-slate-500 font-medium mt-1">Current Stock: <span className="text-slate-900 font-black">{historyProduct.quantity}</span></p>
            </div>

            <div className="overflow-y-auto flex-1 p-0 bg-slate-50/50">
               {(!historyProduct.stockHistory || historyProduct.stockHistory.length === 0) ? (
                 <div className="p-8 text-center text-slate-500 font-medium">No stock history available.</div>
               ) : (
                 <ul className="divide-y divide-slate-100">
                    {[...historyProduct.stockHistory].reverse().map(log => {
                       const isOut = log.type === 'OUT' || log.change < 0;
                       return (
                       <li key={log.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors bg-white">
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{log.note || 'Automatic Adjustment'}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                         </div>
                         <div className={`px-4 py-1.5 rounded-lg font-black text-sm border ${isOut ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {isOut ? '' : '+'}{log.change}
                         </div>
                       </li>
                    )})}
                 </ul>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
