import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';

const galleryPhotos = [
  {
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&auto=format&fit=crop',
    label: 'Fade Clásico'
  },
  {
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop',
    label: 'Degradado Moderno'
  },
  {
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop',
    label: 'Corte Texturizado'
  },
  {
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop',
    label: 'Arreglo de Barba'
  },
  {
    url: 'https://images.unsplash.com/photo-1560869713-da86a9ec0744?w=800&auto=format&fit=crop',
    label: 'Pompadour'
  },
];

export default function Home() {
  const [current, setCurrent] = useState(0);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % galleryPhotos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent(c => (c - 1 + galleryPhotos.length) % galleryPhotos.length);
  const next = () => setCurrent(c => (c + 1) % galleryPhotos.length);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container hero-content">
          <h1>Precisión en <br /><span style={{ color: 'var(--text-muted)' }}>cada detalle.</span></h1>
          <p>Un espacio exclusivo, diseñado a medida para perfeccionar tu imagen.</p>
          <div className="hero-actions">
            <Link to="/book" className="btn-primary">
              <Calendar size={20} />
              Reservar Turno
            </Link>
            <Link to="/products" className="btn-outline">
              Ver Productos
            </Link>
          </div>
        </div>
      </section>

      {/* GALLERY SLIDER */}
      <section className="section" style={{ padding: '60px 0', background: '#fafafa', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="text-center mb-8">
            <h2 style={{ fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '8px' }}>Nuestro Trabajo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Cada corte, un estilo único.</p>
          </div>

          {/* Slider */}
          <div className="gallery-slider">
            <div className="gallery-track" style={{ transform: `translateX(-${current * 100}%)` }}>
              {galleryPhotos.map((photo, i) => (
                <div key={i} className="gallery-slide">
                  <img src={photo.url} alt={photo.label} />
                  <div className="gallery-label">{photo.label}</div>
                </div>
              ))}
            </div>

            {/* Arrows */}
            <button className="gallery-arrow gallery-arrow-left" onClick={prev} aria-label="Anterior">
              <ChevronLeft size={24} />
            </button>
            <button className="gallery-arrow gallery-arrow-right" onClick={next} aria-label="Siguiente">
              <ChevronRight size={24} />
            </button>

            {/* Dots */}
            <div className="gallery-dots">
              {galleryPhotos.map((_, i) => (
                <button
                  key={i}
                  className={`gallery-dot ${i === current ? 'active' : ''}`}
                  onClick={() => setCurrent(i)}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="section container">
        <div className="text-center mb-8">
          <h2 style={{ fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '8px' }}>Servicios</h2>
          <p style={{ color: 'var(--text-muted)' }}>Cortes precisos y atención personalizada</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', maxWidth: '700px', margin: '0 auto' }}>
          <div className="card text-center">
            <div style={{ background: '#f3f4f6', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#111' }}>
              <Scissors size={26} />
            </div>
            <h3 style={{ marginBottom: '8px' }}>Corte de Pelo</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>Clásico o moderno, con el mejor acabado.</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em' }}>$8,000</p>
          </div>
          <div className="card text-center">
            <div style={{ background: '#f3f4f6', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#111' }}>
              <Scissors size={26} />
            </div>
            <h3 style={{ marginBottom: '8px' }}>Corte + Barba</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>Servicio completo, look integral.</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.02em' }}>$12,000</p>
          </div>
        </div>
      </section>

      {/* POLÍTICA */}
      <section style={{ background: '#111', color: '#fff', padding: '48px 0' }}>
        <div className="container" style={{ maxWidth: '700px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', letterSpacing: '-0.02em' }}>Antes de reservar</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#ccc' }}>
            El cliente se compromete a presentarse <strong style={{ color: '#fff' }}>10 minutos antes</strong> de su turno.
            En caso de cancelar con <strong style={{ color: '#fff' }}>menos de 2 horas de anticipación</strong>, deberá abonar el servicio completo.
            Recibirás un recordatorio automático por email <strong style={{ color: '#fff' }}>30 minutos antes</strong> de tu turno.
          </p>
        </div>
      </section>
    </>
  );
}
