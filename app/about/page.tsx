export default function AboutPage() {
  return (
    <div className="container-shell editorial-page">
      <div className="page-hero">
        <span className="eyebrow subdued">SOBRE LNC SPORTS</span>
        <h1>Objetos con un punto de vista propio.</h1>
        <p>Seleccionamos piezas pensadas para quienes creen que lo cotidiano merece un mejor diseño.</p>
      </div>
      <img className="editorial-page-image" src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80" alt="Interior de diseño cálido" />
      <div className="editorial-copy-block"><span className="eyebrow subdued">Nuestra filosofía</span><h2>Lo premium es una sensación de claridad.</h2><p>LNC SPORTS es una colección de estilo de vida contemporáneo creada alrededor de la sobriedad, la calidad de los materiales y la belleza útil. Creemos que los objetos que nos rodean pueden hacer los rituales diarios más serenos, ricos y personales.</p></div>
      <div className="story-grid">
        <div className="story-card">
          <h3>Diseño</h3>
          <p>Objetos con identidad, proporción y detalles que recompensan la atención.</p>
        </div>
        <div className="story-card">
          <h3>Calidad</h3>
          <p>Materiales durables, acabados refinados y confianza que perdura.</p>
        </div>
        <div className="story-card">
          <h3>Estilo de vida</h3>
          <p>Piezas que hacen que los rituales cotidianos se sientan más intencionales.</p>
        </div>
        <div className="story-card">
          <h3>Exclusividad</h3>
          <p>Un punto de vista distintivo sin ruido innecesario.</p>
        </div>
      </div>
    </div>
  );
}
