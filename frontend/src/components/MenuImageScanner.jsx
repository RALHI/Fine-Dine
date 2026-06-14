import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, Sparkles, Edit3, Check, X, AlertCircle, Loader, Image, Plus, Trash2 } from 'lucide-react';

import { useCurrency } from '../context/CurrencyContext.jsx';

/**
 * MenuImageScanner
 * Props:
 *  - restaurantId  (number)  – the restaurant to add items to
 *  - onItemsAdded  (fn)      – called after items are published so the menu list refreshes
 */
export default function MenuImageScanner({ restaurantId, onItemsAdded }) {
  const { currency, rates, currencyMeta } = useCurrency();
  const [step, setStep]             = useState('idle');   // idle | scanning | review | publishing | done
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scannedFile, setScannedFile] = useState(null);
  const [items, setItems]           = useState([]);        // editable extracted items
  const [selected, setSelected]     = useState([]);        // indexes to publish
  const [error, setError]           = useState('');
  const [publishProgress, setPublishProgress] = useState({ done: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  // ── drag-drop handlers ──────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const onDragLeave = ()  => setIsDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); };

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    setPreviewUrl(URL.createObjectURL(file));
    setScannedFile(file);
    setStep('idle');   // back to idle with preview — user clicks Scan
  };

  // ── scan ───────────────────────────────────────────────────────────────────
  const scanImage = async () => {
    if (!scannedFile) return;
    setStep('scanning');
    setError('');
    setItems([]);
    setSelected([]);

    const token = localStorage.getItem('token');
    const form  = new FormData();
    form.append('file', scannedFile);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/scan-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        // Server returned an error — check if it's about missing API key
        const detail = data.detail || 'Unknown error';
        if (detail.includes('GEMINI_API_KEY')) {
          setError('⚙️ Gemini API key not configured. Please add GEMINI_API_KEY to docker-compose.yml and restart the restaurant-service container. Get a free key at https://aistudio.google.com/app/apikey');
        } else {
          setError(`Scan failed: ${detail}`);
        }
        setStep('idle');
        return;
      }

      const extracted = data.items || [];
      setItems(extracted.map((item, i) => ({ ...item, _id: i })));
      setSelected(extracted.map((_, i) => i)); // select all by default
      setStep('review');
    } catch (err) {
      setError('Network error — could not reach the scan endpoint.');
      setStep('idle');
    }
  };

  // ── item editing ───────────────────────────────────────────────────────────
  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setSelected(prev => prev.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
  };

  const addBlankItem = () => {
    const newIdx = items.length;
    setItems(prev => [...prev, { _id: newIdx, name: '', description: '', price: '', is_available: true }]);
    setSelected(prev => [...prev, newIdx]);
  };

  const toggleSelect = (idx) => {
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  // ── publish ────────────────────────────────────────────────────────────────
  const publishSelected = async () => {
    const toPublish = items.filter((_, i) => selected.includes(i));
    if (toPublish.length === 0) return;

    setStep('publishing');
    setPublishProgress({ done: 0, total: toPublish.length });
    const token = localStorage.getItem('token');
    let done = 0;

    for (const item of toPublish) {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name:        item.name  || 'Unnamed Item',
            description: item.description || '',
            price:       parseFloat(item.price) / (rates[currency] ?? 1) || 9.99,
            is_available: item.is_available !== false,
          }),
        });
        if (res.ok) {
          const createdItem = await res.json();
          if (item.imageFile) {
            const formData = new FormData();
            formData.append('file', item.imageFile);
            await fetch(`/api/restaurants/${restaurantId}/menu/${createdItem.id}/image`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
            });
          }
          done++;
        }
      } catch { /* individual failure, continue */ }
      setPublishProgress({ done: done, total: toPublish.length });
    }

    setStep('done');
    setTimeout(() => {
      setStep('idle');
      setPreviewUrl(null);
      setScannedFile(null);
      setItems([]);
      setSelected([]);
      if (onItemsAdded) onItemsAdded();
    }, 2000);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={18} color="white" />
        </div>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>AI Menu Scanner</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Upload a menu photo — Gemini Vision reads it and generates your item list
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px',
          padding: '12px 14px', marginBottom: '16px',
          display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: '#991B1B',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span style={{ whiteSpace: 'pre-wrap' }}>{error}</span>
        </div>
      )}

      {/* Drop zone */}
      {step !== 'review' && step !== 'publishing' && step !== 'done' && (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#6366F1' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? '#EEF2FF' : 'var(--surface)',
            transition: 'all 0.2s',
            position: 'relative',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />

          {previewUrl ? (
            <div>
              <img
                src={previewUrl} alt="Menu preview"
                style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain', marginBottom: '12px' }}
              />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {scannedFile?.name} · Click or drag to replace
              </p>
            </div>
          ) : (
            <div>
              <Image size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                Drop your menu photo here
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                JPEG, PNG or WebP · max 10 MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(step === 'idle') && previewUrl && (
        <button
          onClick={scanImage}
          style={{
            marginTop: '12px', width: '100%', padding: '11px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: 'white', border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <Sparkles size={16} /> Scan with AI
        </button>
      )}

      {/* Scanning spinner */}
      {step === 'scanning' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Loader size={36} style={{ color: '#6366F1', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600, color: '#6366F1' }}>Reading your menu with Gemini Vision…</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This usually takes 5–15 seconds</p>
        </div>
      )}

      {/* Review table */}
      {step === 'review' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontWeight: 700, fontSize: '14px' }}>
              ✨ {items.length} items extracted — review &amp; edit before publishing
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setStep('idle'); setPreviewUrl(null); setScannedFile(null); setItems([]); }}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={13} /> Rescan
              </button>
              <button
                onClick={addBlankItem}
                style={{ padding: '6px 12px', border: '1px solid #6366F1', borderRadius: '8px', background: '#EEF2FF', color: '#6366F1', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={13} /> Add Row
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '28px 44px 1.5fr 2fr 90px 80px 30px',
            gap: '8px', padding: '6px 8px',
            fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>✓</span><span>Img</span><span>Dish Name</span><span>Description</span>
            <span>Price ({currencyMeta?.symbol || '$'})</span><span>Available</span><span></span>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto', marginBottom: '16px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '28px 44px 1.5fr 2fr 90px 80px 30px',
                gap: '8px', alignItems: 'center',
                padding: '8px',
                background: selected.includes(idx) ? '#F5F3FF' : 'white',
                borderRadius: '8px', marginBottom: '4px',
                border: `1px solid ${selected.includes(idx) ? '#C4B5FD' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.includes(idx)}
                  onChange={() => toggleSelect(idx)}
                  style={{ cursor: 'pointer', accentColor: '#6366F1', width: '16px', height: '16px' }}
                />
                {/* Image Upload */}
                <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '6px', background: '#F3F4F6', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                     onClick={() => document.getElementById(`img-upload-${idx}`).click()}>
                   {item.imagePreview ? <img src={item.imagePreview} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="preview" /> : <Image size={16} color="var(--text-muted)" />}
                   <input type="file" id={`img-upload-${idx}`} style={{display:'none'}} accept="image/jpeg,image/png,image/webp" onChange={e => {
                     if (e.target.files && e.target.files[0]) {
                       updateItem(idx, 'imageFile', e.target.files[0]);
                       updateItem(idx, 'imagePreview', URL.createObjectURL(e.target.files[0]));
                     }
                   }} />
                </div>
                {/* Name */}
                <input
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  placeholder="Item name"
                  style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '100%', background: 'white' }}
                />
                {/* Description */}
                <input
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  placeholder="Short description"
                  style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '100%', background: 'white' }}
                />
                {/* Price */}
                <input
                  type="number" step="0.01" min="0"
                  value={item.price}
                  onChange={e => updateItem(idx, 'price', e.target.value)}
                  style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '100%', background: 'white' }}
                />
                {/* Available */}
                <select
                  value={item.is_available ? 'true' : 'false'}
                  onChange={e => updateItem(idx, 'is_available', e.target.value === 'true')}
                  style={{ padding: '6px 4px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: 'white', width: '100%' }}
                >
                  <option value="true">✅ Yes</option>
                  <option value="false">❌ No</option>
                </select>
                {/* Remove */}
                <button
                  onClick={() => removeItem(idx)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Publish bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {selected.length} of {items.length} selected
            </span>
            <button
              onClick={publishSelected}
              disabled={selected.length === 0}
              style={{
                padding: '10px 20px',
                background: selected.length > 0 ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'var(--border)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontWeight: 700, fontSize: '14px',
                cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Check size={16} /> Publish {selected.length} Items
            </button>
          </div>
        </div>
      )}

      {/* Publishing progress */}
      {step === 'publishing' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Loader size={32} style={{ color: '#6366F1', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600 }}>Publishing items…</p>
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', margin: '12px 0' }}>
            <div style={{
              width: `${(publishProgress.done / publishProgress.total) * 100}%`,
              height: '100%', background: '#6366F1', borderRadius: '3px', transition: 'width 0.3s',
            }} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {publishProgress.done} / {publishProgress.total} published
          </p>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#ECFDF5', border: '2px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px auto',
          }}>
            <Check size={28} color="#10B981" />
          </div>
          <p style={{ fontWeight: 700, fontSize: '16px', color: '#059669' }}>
            {publishProgress.done} items added to your menu!
          </p>
        </div>
      )}
    </div>
  );
}
