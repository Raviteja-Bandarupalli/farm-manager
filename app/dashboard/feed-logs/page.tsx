'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

type FeedType = 'Pre-Starter' | 'Starter' | 'Grower'

export default function FeedLogsPage() {
    const [showForm, setShowForm] = useState(false)
    const [feedType, setFeedType] = useState<FeedType | ''>('')
    const [farm, setFarm] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [maize, setMaize] = useState('')
    const [soya, setSoya] = useState('')
    const [rice, setRice] = useState('')
    const [suppl, setSuppl] = useState('')
    const [oil, setOil] = useState('')
    const [farms, setFarms] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [saving, setSaving] = useState(false)

  const total = (parseFloat(maize)||0) + (parseFloat(soya)||0) + (parseFloat(rice)||0) + (parseFloat(suppl)||0) + (parseFloat(oil)||0)

  useEffect(() => {
        supabase.from('farms').select('*').then(({ data }) => setFarms(data || []))
        supabase.from('feed_logs').select('*').order('date', { ascending: false }).then(({ data }) => setLogs(data || []))
  }, [])

  const handleSave = async () => {
        if (!farm || !feedType || !date) return alert('Please fill farm, feed type and date')
        setSaving(true)
        const { error } = await supabase.from('feed_logs').insert({
                farm_id: farm,
                date,
                feed_type: feedType,
                maize_kg: parseFloat(maize) || 0,
                soya_kg: parseFloat(soya) || 0,
                rice_kg: parseFloat(rice) || 0,
                supplement_kg: parseFloat(suppl) || 0,
                oil_ltr: parseFloat(oil) || 0,
                total_kg: total,
        })
        setSaving(false)
        if (error) return alert('Error saving: ' + error.message)
        setShowForm(false)
        setFeedType(''); setFarm(''); setMaize(''); setSoya(''); setRice(''); setSuppl(''); setOil('')
        supabase.from('feed_logs').select('*').order('date', { ascending: false }).then(({ data }) => setLogs(data || []))
  }

  return (
        <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Feed Mixing</h1>h1>
                                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Daily feed production log</p>p>
                          </div>div>
                        <button onClick={() => setShowForm(true)} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 18px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                                  + New Entry
                        </button>button>
                </div>div>
        
          {showForm && (
                  <div style={{ position: 'fixed', inset</div>
