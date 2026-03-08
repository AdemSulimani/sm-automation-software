import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="legal-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo">SM Automation</Link>
          <nav className="landing-nav">
            <Link to="/login" className="landing-btn landing-btn-primary">Hyr</Link>
          </nav>
        </div>
      </header>
      <main className="legal-main legal-main--privacy">
        <h1>Politika e Privatësisë</h1>
        <p className="legal-updated">
          Kjo politikë përshkruan në gjuhë të thjeshtë si mbledhim, ruajmë, përdorim dhe mbrojmë të dhënat tuaja. Është e rëndësishme veçanërisht për përdoruesit që lidhin faqe ose kanale Meta (Facebook, Instagram) dhe Viber.
        </p>

        <section className="legal-section">
          <h2>1. Kush jemi</h2>
          <p>
            <strong>SM Automation</strong> është shërbimi që ofron automatizim mesazhesh për biznese, përgjigje të mençura me AI dhe integrim me Facebook, Instagram dhe Viber.
          </p>
          <p>
            Për çdo pyetje në lidhje me privatësinë ose të dhënat tuaja, na kontaktoni në:{' '}
            <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>.
          </p>
          <p>
            <em>Nëse keni emër zyrtar kompanie, adresë fizike ose vend (p.sh. Shqipëri), mund t’i shtoni këtu.</em>
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Çfarë të dhënash mbledhim</h2>

          <h3>2.1 Nga përdoruesit e aplikacionit (ju)</h3>
          <ul>
            <li><strong>Emër</strong> – për identifikimin e llogarisë.</li>
            <li><strong>Email</strong> – për hyrje në sistem dhe komunikim.</li>
            <li><strong>Fjalëkalim</strong> – ruhet vetëm në formë të hash-uar (enkriptuar të pakthyeshme), kurrë në formë të lexueshme.</li>
            <li><strong>Informacion kompanie (companyInfo)</strong> – përshkrimi i kompanisë, produkteve, çmimeve, FAQ etj., që përdoret nga sistemi i përgjigjeve me AI për të përgjigjur klientëve tuaj.</li>
            <li><strong>Roli (admin ose client)</strong> – për të dalluar administratorët nga klientët dhe për të kontrolluar qasjen në funksione.</li>
          </ul>

          <h3>2.2 Nga Meta (Facebook / Instagram) – përmes integrimit</h3>
          <p>
            Kur lidhni një faqe ose kanal Meta me aplikacionin tonë, ne marrim të dhëna që Meta na dërgon për funksionimin e shërbimit:
          </p>
          <ul>
            <li><strong>Identifikues të faqes/kanaleve</strong> (Page ID, identifikues të profilit).</li>
            <li><strong>Tokena aksesi</strong> – që na lejojnë të dërgojmë dhe të marrim mesazhe në emër të faqes suaj (ato ruhen në mënyrë të sigurt në serverin tonë).</li>
            <li><strong>Mesazhe dhe metadata</strong> që Meta dërgon nëpër webhook: përmbajtja e mesazheve (tekst, nëse ka), ID të përdoruesve të platformës (Facebook/Instagram), ID konversacionesh, kohë dërguar, etj. Këto përdoren vetëm për të shfaqur bisedat në Inbox, për automatizim dhe për përgjigje me AI. <strong>Ne nuk përdorim këto të dhëna për reklama ose analitika të avancuara të Meta</strong>; përdorim vetëm ato që na nevojiten për të ofruar inbox të unifikuar, automatizim dhe përgjigje të mençura.</li>
          </ul>

          <h3>2.3 Nga Viber</h3>
          <p>
            Nëse përdorni integrimin me Viber, mbledhim të dhëna të ngjashme për kanalet dhe bisedat: identifikues të botit (Bot ID), tokena aksesi, mesazhe dhe metadata që Viber dërgon (përmbajtje, ID përdoruesish, etj.) – vetëm për ofrimin e shërbimit të mesazheve dhe AI.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Për çfarë i përdorim të dhënat</h2>
          <ul>
            <li><strong>Ofrimi i shërbimit</strong> – inbox i unifikuar, rregulla automatizimi, përgjigje me fjalë kyçe, përgjigje me AI (p.sh. përmes Groq), ndalur/aktivizuar boti, përgjigje manuale.</li>
            <li><strong>Mirëmbajtja e llogarive</strong> – hyrje në sistem, menaxhimi i kanaleve dhe të cilësimeve.</li>
            <li><strong>Përmirësimi i produktit</strong> – për të ofruar një shërbim më të mirë dhe më të sigurt.</li>
            <li><strong>Respektimi i ligjeve</strong> – kur ligji na kërkon të ruajmë ose të përpunojmë të dhëna.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Si i ruajmë të dhënat</h2>
          <ul>
            <li>Të dhënat përpunohen dhe ruhen në <strong>serveret</strong> ku hostohet aplikacioni. Mund të përdorni providerë hosting në EU, US ose zona të tjera – rekomandohet të përmendni vendin aktual nëse e dini.</li>
            <li>Përdorim një <strong>bazë të dhënash (MongoDB)</strong> për të ruajtur përdoruesit, kanalet, bisedat dhe mesazhet.</li>
            <li><strong>Siguria:</strong> komunikimi mes shfletuesit tuaj dhe serverit është i mbrojtur (enkriptim në tranzit, p.sh. HTTPS). Fjalëkalimet ruhen vetëm të hash-uar (me algoritme të fuqishme) dhe nuk mund të rikthehen në formë të lexueshme. Tokenat e aksesit (Meta/Viber) mund të ruhen të enkriptuar në pushim (AES-256) kur ky mënyrë është aktivizuar në server; të dhënat e tjera të ndjeshme ruhen në mënyrë të kontrolluar.</li>
            <li>Për shërbime të jashtme (hosting, bazë të dhënash, AI) përpiqemi të përdorim providerë të besueshëm me praktika të mira sigurie.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Sa kohë i mbajmë të dhënat</h2>
          <p>
            Të dhënat e llogarisë (emër, email, companyInfo, rol) mbahen <strong>sa kohë që llogaria juaj është aktive</strong>. Mesazhet dhe historiku i bisedave mbahen për të mundësuar funksionimin e Inbox dhe të automatizimit; ne nuk i fshijmë automatikisht pas një afati të caktuar, por ju mund të kërkoni fshirjen e të dhënave (shih të drejtat më poshtë).
          </p>
          <p>
            Pas <strong>çaktivizimit ose fshirjes së llogarisë</strong>, ne mund të mbajmë disa të dhëna për një periudhë të kufizuar për detyra ligjore ose teknikë (p.sh. backup), pas së cilës ato fshihen ose anonimizohen. Mund të përcaktoni një afat konkret (p.sh. 30 ditë, 6 muaj) nëse e dini.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Nëse i ndajmë me të tjerë</h2>
          <ul>
            <li><strong>Meta (Facebook / Instagram)</strong> – për funksionimin e integrimit na nevojiten lidhjet me platformën e tyre; të dhënat që ata na dërgojnë (mesazhe, metadata) përpunohen nga ne sipas kësaj politike. Ne <strong>nuk u shesim të dhënat tuaja ose të klientëve tuaj për reklama</strong> Meta.</li>
            <li><strong>Viber</strong> – e njëjta logjikë vlen për integrimin me Viber: përdorim vetëm ato që na nevojiten për shërbimin.</li>
            <li><strong>Providerë teknikë</strong> – hosting, bazë të dhënash, dhe shërbime të jashtme si <strong>Groq</strong> (për përgjigje AI). Këta providerë përpunojnë të dhëna vetëm për të ofruar shërbimin dhe sipas marrëveshjeve të nevojshme.</li>
          </ul>
          <p>
            <strong>Ne nuk shesim të dhënat tuaja për qëllime reklamimi ose tjetër.</strong>
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Bazat ligjore dhe të drejtat tuaja (p.sh. GDPR)</h2>
          <p>
            Për përdoruesit në EEA/UK, përpunimi bazohet në: <strong>ekzekutimin e kontratës</strong> (ofrimi i shërbimit), <strong>interesin legjitim</strong> (mirëmbajtja, siguria, përmirësimi), dhe ku ligji e kërkon – <strong>pëlqimin tuaj</strong>.
          </p>
          <p>Ju keni të drejtë të:</p>
          <ul>
            <li><strong>Qasje</strong> – të kërkoni një kopje të të dhënave tuaja që mbajmë.</li>
            <li><strong>Ndreqje</strong> – të kërkoni korrigjimin e të dhënave të pasakta.</li>
            <li><strong>Fshirje</strong> – të kërkoni fshirjen e të dhënave tuaja (“e drejta për të u harruar”), në kufijtë e ligjit.</li>
            <li><strong>Portabilitet</strong> – të kërkoni të dhënat tuaja në një format të përdorueshëm, ku është e zbatueshme.</li>
            <li><strong>Ankim</strong> – të ankoheni te autoriteti i mbrojtjes së të dhënave të kompetent (p.sh. në vendin tuaj).</li>
          </ul>
          <p>
            <strong>Si t’i ushtroni:</strong> ju mund të kërkojni <strong>eksportin e të dhënave tuaja</strong> (portabilitet) dhe <strong>fshirjen e llogarisë</strong> direkt nga aplikacioni (në Cilësime ose Profil), ose duke na kontaktuar në <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Cookies dhe teknologji në shfletues</h2>
          <p>
            Aplikacioni përdor <strong>ruajtje lokale (localStorage)</strong> në shfletuesin tuaj për të mbajtur <strong>tokenin e hyrjes</strong> dhe të dhënat e shkurtra të përdoruesit (emër, email, rol) që ju të mbeteni të loguar. Këto nuk janë “cookies” në kuptimin klasik, por përdoren vetëm për autentifikim dhe nuk i ndajmë me palë të treta për reklama. Nëse bëni “Dil” (logout), këto të dhëna fshihen nga pajisja juaj.
          </p>
          <p>
            Nëse në të ardhmen përdorim cookies për analitikë ose për përvojë përdoruesi, do ta përditësojmë këtë seksion dhe, ku nevojitet, do të kërkojmë pëlqimin tuaj.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Ndryshime në politikë</h2>
          <p>
            Ne mund të përditësojmë këtë politika për të pasqyruar ndryshime në praktikat tona ose në ligj. Kur bëjmë ndryshime të rëndësishme, do t’ju njoftojmë përmes <strong>emailit</strong> (në adresën e llogarisë suaj) ose me një njoftim të dukshëm <strong>në faqen e aplikacionit</strong>. Data e fundit e përditësimit mund të shënohet në krye të dokumentit.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Kontakt për privatësi</h2>
          <p>
            Për çdo pyetje ose kërkesë në lidhje me privatësinë dhe të dhënat tuaja, duke përfshirë ushtrimin e të drejtave (qasje, ndreqje, fshirje, portabilitet, ankim), na shkruani në:{' '}
            <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>.
          </p>
        </section>

        <p className="legal-back">
          <Link to="/" className="back-link">← Kthehu në faqen kryesore</Link>
        </p>
      </main>
    </div>
  );
}
