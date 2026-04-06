import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Package, Plus, Search, Edit2, Trash2, X, ArchiveRestore, AlertCircle, History, ArrowDownCircle, ArrowUpCircle, IndianRupee, Boxes, TrendingDown } from 'lucide-react';
import { generateId } from '../utils/storage';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, addStock } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockType, setStockType] = useState('IN');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', purchasePrice: '', sellingPrice: '', quantity: '', lowStockThreshold: 5 });
  const [stockForm, setStockForm] = useState({ qtyChange: '', note: '' });

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  const stats = useMemo(() => {
    const lowStock = products.filter(p => p.quantity <= (p.lowStockThreshold || 5)).length;
    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.sellingPrice || p.selling_price || 0) * (p.quantity || 0)), 0);
    return { total: products.length, lowStock, totalValue };
  }, [products]);

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
      purchasePrice: product.purchasePrice || product.purchase_price || product.price || '', 
      sellingPrice: product.sellingPrice || product.selling_price || product.price || '', 
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold || product.low_stock_threshold || 5
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
            id: generateId(),
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

  const getStockStatus = (product) => {
    const threshold = product.lowStockThreshold || product.low_stock_threshold || 5;
    if (product.quantity <= 0) return { label: 'Out of Stock', color: 'bg-red-500 text-white', ring: 'ring-red-500/20' };
    if (product.quantity <= threshold) return { label: 'Low Stock', color: 'bg-amber-500 text-white', ring: 'ring-amber-500/20' };
    return { label: 'In Stock', color: 'bg-emerald-500 text-white', ring: 'ring-emerald-500/20' };
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Inventory
            {stats.lowStock > 0 && (
               <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm animate-pulse">
                 <AlertCircle size={14} /> {stats.lowStock} Low
               </span>
            )}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage your product catalogue</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-3 rounded-2xl transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 whitespace-nowrap"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Boxes size={16} className="text-indigo-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Products</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock</span>
          </div>
          <p className="text-2xl font-black text-red-500">{stats.lowStock}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</span>
          </div>
          <p className="text-lg font-black text-slate-800 truncate">₹{stats.totalValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 px-4">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search products..." 
          className="flex-1 py-1 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Product Cards Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-slate-100 p-6 rounded-full mb-5">
            <Package size={48} className="text-slate-300" />
          </div>
          <p className="font-black text-slate-700 text-xl mb-2">No Products Yet</p>
          <p className="text-slate-500 text-sm mb-6 font-medium">Add your first product to start tracking inventory.</p>
          <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            <Plus size={18} /> Add First Product
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={40} className="text-slate-300 mb-4" />
          <p className="font-bold text-slate-600">No products match "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, idx) => {
            const stockStatus = getStockStatus(product);
            const sellingPrice = parseFloat(product.sellingPrice || product.selling_price || product.price || 0);
            const purchasePrice = parseFloat(product.purchasePrice || product.purchase_price || 0);
            const margin = sellingPrice > 0 && purchasePrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice * 100).toFixed(0) : null;

            return (
              <div 
                key={product.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group card-animate"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-base truncate">{product.name}</h3>
                      {product.hsn && <p className="text-[11px] text-slate-400 font-medium mt-0.5">HSN: {product.hsn}</p>}
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full whitespace-nowrap ring-2 ${stockStatus.color} ${stockStatus.ring}`}>
                      {stockStatus.label}
                    </span>
                  </div>
                </div>

                {/* Price & Stock Section */}
                <div className="px-5 pb-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selling Price</p>
                      <p className="text-2xl font-black text-indigo-600 tracking-tight">₹{sellingPrice.toLocaleString('en-IN')}</p>
                      {purchasePrice > 0 && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Cost: ₹{purchasePrice.toLocaleString('en-IN')}
                          {margin && <span className="ml-1.5 text-emerald-500 font-bold">({margin}% margin)</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Stock</p>
                      <p className={`text-3xl font-black tracking-tighter ${product.quantity <= 0 ? 'text-red-500' : product.quantity <= (product.lowStockThreshold || product.low_stock_threshold || 5) ? 'text-amber-500' : 'text-slate-800'}`}>
                        {product.quantity}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5 flex items-center justify-between gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openStockModal(product); }} 
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 border border-indigo-100 hover:border-indigo-600"
                  >
                    <ArchiveRestore size={14} /> Adjust
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openHistoryModal(product); }} 
                      className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-all active:scale-95" 
                      title="Stock History"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(product); }} 
                      className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-all active:scale-95" 
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this product?')) deleteProduct(product.id); }} 
                      className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all active:scale-95" 
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] flex flex-col">
            {/* Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300"></div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-slate-800">
              <h3 className="text-lg font-black flex items-center gap-2">
                {editingProduct ? <Edit2 size={18} className="text-indigo-600" /> : <Plus size={18} className="text-indigo-600" />}
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Name *</label>
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
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Purchase ₹</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({...productForm, purchasePrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Selling ₹ *</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({...productForm, sellingPrice: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-800 font-bold shadow-inner"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{editingProduct ? 'Current Stock' : 'Initial Stock'}</label>
                    <input 
                      type="number" required min="0"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({...productForm, quantity: e.target.value})}
                      disabled={!!editingProduct} 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      placeholder="0"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Low Alert At</label>
                    <input 
                      type="number" required min="0"
                      value={productForm.lowStockThreshold}
                      onChange={(e) => setProductForm({...productForm, lowStockThreshold: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                      placeholder="5"
                    />
                 </div>
              </div>
              {editingProduct && <p className="text-xs text-slate-500 text-center font-medium bg-slate-50 p-2.5 rounded-xl">Use "Adjust Stock" to change quantities.</p>}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors active:scale-95">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-slate-100">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300"></div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ArchiveRestore size={18} className="text-indigo-600" /> Adjust Stock
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleStockSubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Product</p>
                <p className="font-black text-slate-900 text-xl">{stockProduct?.name}</p>
                <div className="mt-3 flex justify-center items-center gap-2">
                   <span className="text-xs font-bold text-slate-500 uppercase">Current:</span>
                   <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-black text-slate-800">{stockProduct?.quantity}</span>
                </div>
              </div>
              
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                 <button type="button" onClick={() => setStockType('IN')} className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${stockType === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                    <ArrowUpCircle size={16} /> Stock IN
                 </button>
                 <button type="button" onClick={() => setStockType('OUT')} className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${stockType === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>
                    <ArrowDownCircle size={16} /> Stock OUT
                 </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Quantity</label>
                <div className="flex items-center">
                  <span className={`border border-r-0 rounded-l-xl px-4 py-3 select-none ${stockType === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                     <span className="text-lg font-black">{stockType === 'IN' ? '+' : '-'}</span>
                  </span>
                  <input 
                    type="number" required min="1" autoFocus
                    value={stockForm.qtyChange}
                    onChange={(e) => setStockForm({...stockForm, qtyChange: e.target.value})}
                    className={`w-full px-4 py-3 rounded-r-xl border focus:ring-2 focus:outline-none text-slate-800 text-lg font-black transition-colors ${stockType === 'IN' ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20' : 'border-red-200 focus:border-red-500 focus:ring-red-500/20'}`}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Reason</label>
                <input 
                  type="text" required
                  value={stockForm.note}
                  onChange={(e) => setStockForm({...stockForm, note: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-700 font-medium"
                  placeholder={stockType === 'IN' ? 'e.g. Replenishment' : 'e.g. Damage / Return'}
                />
              </div>

              <button type="submit" className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${stockType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'}`}>
                Confirm Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STOCK HISTORY MODAL */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300"></div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <History size={18} className="text-indigo-600" /> Stock History
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-5 bg-white flex-shrink-0 border-b border-slate-100">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
               <h4 className="text-2xl font-black text-slate-800">{historyProduct.name}</h4>
               <p className="text-slate-500 font-medium mt-1">Current Stock: <span className="text-slate-900 font-black">{historyProduct.quantity}</span></p>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-50/50">
               {(!historyProduct.stockHistory && !historyProduct.stock_history) || (historyProduct.stockHistory || historyProduct.stock_history || []).length === 0 ? (
                 <div className="p-8 text-center text-slate-500 font-medium">No stock history available.</div>
               ) : (
                 <ul className="divide-y divide-slate-100">
                    {[...(historyProduct.stockHistory || historyProduct.stock_history || [])].reverse().map(log => {
                       const isOut = log.type === 'OUT' || log.change < 0;
                       return (
                       <li key={log.id} className="p-4 flex justify-between items-center hover:bg-white transition-colors">
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{log.note || 'Automatic Adjustment'}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(log.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                         </div>
                         <div className={`px-4 py-1.5 rounded-xl font-black text-sm border ${isOut ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
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
