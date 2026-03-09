import { Link } from 'react-router-dom';

export function Terms() {
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
        <h1>Kushtet e Shërbimit (Terms of Service)</h1>
        <p className="legal-updated">
          Duke përdorur SM Automation, ju pranoni këto kushte. Ju lutemi lexojini me kujdes.
        </p>

        <section className="legal-section">
          <h2>1. Pranimi i kushteve</h2>
          <p>
            SM Automation është një shërbim që ofron automatizim mesazhesh për biznese, integrim me Facebook, Instagram dhe Viber, dhe përgjigje me ndihmën e AI. Duke u regjistruar, hyrë në llogari ose përdorur shërbimin tonë, ju konfirmoni që keni lexuar, kuptuar dhe pajtoheni të respektoni këto <strong>Kushte të Shërbimit</strong> dhe <Link to="/privacy">Politikën tonë të Privatësisë</Link>.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Llogaria dhe përdorimi i shërbimit</h2>
          <p>
            Ju jeni përgjegjës për të mbajtur të dhënat e llogarisë tuaj të sakta dhe për fjalëkalimin tuaj. Përdorimi i shërbimit duhet të jetë në përputhje me këto kushte dhe me të gjitha ligjet dhe rregullat e zbatueshme. Ne ofrojmë shërbimin “si është” për qëllime legitime biznesi: menaxhimin e mesazheve me klientët nëpërmjet kanaleve të lidhura (Facebook, Instagram, Viber), inbox të unifikuar, automatizim dhe përgjigje me AI.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Përgjegjësitë e përdoruesit</h2>
          <p>Ju pranoni të:</p>
          <ul>
            <li><strong>Mos abuzoni</strong> me shërbimin: të mos përdorni sistemin për spam, mashtrim, të dhëna të rreme, ose për të ngarkuar përmbajtje të paligjshme, ofenduese ose që shkel të drejtat e të tjerëve.</li>
            <li><strong>Respektoni politikën e Meta</strong> (Facebook / Instagram) kur lidhni faqe ose kanale me aplikacionin tonë. Përdorimi i integrimit me Meta duhet të jetë në përputhje me <a href="https://www.facebook.com/policies" target="_blank" rel="noopener noreferrer">Politikat e Meta</a> (përfshirë politikën e të dhënave dhe kushtet e Meta Business), si dhe me udhëzimet e tyre për faqe dhe Instagram. Çdo shkelje e politikave të Meta mund të çojë në çaktivizim nga ana e tyre ose nga ana jonë.</li>
            <li>Kur përdorni Viber, të respektoni politikën dhe kushtet e <a href="https://www.viber.com/terms/" target="_blank" rel="noopener noreferrer">Viber</a>.</li>
            <li>Të mos përpiqeni të aksesoni sisteme, llogari ose të dhëna që nuk ju takojnë, ose të çaktivizoni masat e sigurisë të shërbimit.</li>
            <li>Të përdorni përmbajtjen dhe të dhënat e klientëve tuaj (mesazhet që kalojnë nëpër platformë) në mënyrë të ligjshme dhe në respekt të privatësisë dhe të drejtave të tyre.</li>
          </ul>
          <p>
            Ne nuk kontrollojmë përmbajtjen që ju ose klientët tuaj shkëmbejnë; ju jeni përgjegjës për përdorimin tuaj të shërbimit dhe për respektimin e politikave të platformave të palëve të treta (Meta, Viber).
          </p>
        </section>

        <section className="legal-section">
          <h2>3.1. Anti-spam dhe kufizimi i mesazheve</h2>
          <p>
            Për të mbrojtur reputacionin e aplikacionit dhe për të respektuar politikat e platformave (sidomos Meta),
            ne monitorojmë vëllimin e mesazheve dhe gabimet që vijnë nga API-të e tyre (p.sh. njoftime për spam ose
            bllokime). Nëse shohim sjellje të dyshimtë – si numër shumë i madh mesazhesh në kohë të shkurtër, përqindje
            të lartë të gabimeve të tipit “spam/blocked” ose raportime nga platforma – ne mund të:
          </p>
          <ul>
            <li>Kufizojmë përkohësisht dërgimin e mesazheve nga kanalet tuaja (p.sh. status “throttled” ose “suspended”).</li>
            <li>Kufizojmë dërgimin e mesazheve në nivel biznesi (p.sh. <strong>messagingLimited</strong> për biznesin tuaj) derisa situata të qartësohet.</li>
            <li>T’ju kontaktojmë për shpjegime dhe, në raste të rënda, të ndërpresim përfundimisht qasjen tuaj.</li>
          </ul>
          <p>
            Duke përdorur SM Automation, ju pranoni që përdorimi i shërbimit për spam ose shkelje të politikave të
            platformave na jep të drejtën të kufizojmë ose të mbyllim llogarinë tuaj dhe kanalet e lidhura, për të
            mbrojtur përdoruesit e tjerë dhe integrimet tona me palë të treta.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Ndërprerja ose mbyllja e shërbimit / llogarisë</h2>
          <p>
            <strong>Ne mund të ndërpresim ose të mbyllim</strong> qasjen tuaj ndaj shërbimit ose llogarinë tuaj, përkohësisht ose përfundimisht, nëse:
          </p>
          <ul>
            <li>Shkeleni këto Kushte të Shërbimit ose Politikën e Privatësisë.</li>
            <li>Përdorimi juaj është i dëmshëm, mashtrues, i paligjshëm ose në kundërshtim me politikën e Meta, Viber ose çdo platforme tjetër të integruar.</li>
            <li>Kërkohet nga ligji ose nga një autoritet kompetent.</li>
            <li>Ne vendosim të ndërpresim ose të mbyllim shërbimin në tërësi (p.sh. për arsye operative, teknike ose biznesi). Në raste të tilla, do të përpiqemi t’ju njoftojmë me kohë, kur është e mundur.</li>
          </ul>
          <p>
            Pas mbylljes së llogarisë, e drejta juaj për të përdorur shërbimin pushon. Ne mund të mbajmë disa të dhëna sipas Politikës sonë të Privatësisë (p.sh. për detyra ligjore).
          </p>
          <p>
            Ju mund të <strong>çaktivizoni ose të mbyllni llogarinë tuaj</strong> në çdo kohë duke na kontaktuar në <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Kufizimi i përgjegjësisë (Disclaimer)</h2>
          <p>
            Shërbimi ofrohet “<strong>si është</strong>” dhe “<strong>si disponibël</strong>”. Brenda kufijve të lejuar nga ligji:
          </p>
          <ul>
            <li>Ne <strong>nuk garantojmë</strong> që shërbimi do të jetë pa ndërprerje, pa gabime ose i sigurt plotësisht. Përdorimi është në riskun tuaj.</li>
            <li>Ne <strong>nuk jemi përgjegjës</strong> për dëme indirekte, të nevojshme, të rastësishme, speciale ose pasojë (p.sh. humbje të dhënash, humbje fitimi, ndërprerje biznesi) që lindin nga përdorimi ose pamundësia për përdorimin e shërbimit, edhe nëse jemi njoftuar për mundësinë e tyre.</li>
            <li>Përgjegjësia jonë për çdo kërkesë që lidhet me shërbimin kufizohet në masën e lejuar nga ligji (p.sh. për shërbime me pagesë: deri në shumën e paguar nga ju gjatë periudhës përkatëse, ose në kufijtë e tjerë të zbatueshëm).</li>
          </ul>
          <p>
            Këto kufizime nuk përjashtojnë ose kufizojnë përgjegjësinë tonë aty ku ligji nuk e lejon (p.sh. për vdekje ose dëm fizik për shkak të gabimit tonë, ose për mashtrim).
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Ligji që zbatohet</h2>
          <p>
            Këto Kushte të Shërbimit rregullohen dhe interpretohen në përputhje me <strong>ligjin e Republikës së Shqipërisë</strong>. Nëse operojmë nga një juridiksion tjetër dhe kjo ndikohet në marrëveshjen tuaj me ne, mund të përcaktohet ligji i atij vendi; në këtë rast do ta njoftojmë në faqe ose në kushte.
          </p>
          <p>
            Çdo mosmarrëveshje që lind nga këto kushte ose nga përdorimi i shërbimit do të zgjidhet nga gjykatat kompetente në Shqipëri, përveç nëse ligji juaj lokal kërkon ndryshe.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Lidhje me dokumente të tjera</h2>
          <ul>
            <li><strong>Politika e Privatësisë:</strong> Si mbledhim, ruajmë dhe përdorim të dhënat tuaja përshkruhet në <Link to="/privacy">Politikën tonë të Privatësisë</Link>. Duke përdorur shërbimin, ju pranoni edhe atë politikë.</li>
            <li><strong>Meta (Facebook / Instagram):</strong> Kur lidhni faqe ose kanale Facebook/Instagram, përdorimi i tyre rregullohet nga politikën dhe kushtet e Meta. Ju rekomandojmë të lexoni: <a href="https://www.facebook.com/terms" target="_blank" rel="noopener noreferrer">Kushtet e Meta</a>, <a href="https://www.facebook.com/policies" target="_blank" rel="noopener noreferrer">Politikat e Meta</a>, dhe nëse përdorni Meta Business Tools, politikën përkatëse të biznesit.</li>
            <li><strong>Viber:</strong> Për integrimin me Viber, zbatohen <a href="https://www.viber.com/terms/" target="_blank" rel="noopener noreferrer">Kushtet e Viber</a>.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Ndryshime të kushteve</h2>
          <p>
            Ne mund të ndryshojmë këto Kushte të Shërbimit. Nëse ndryshimet janë të rëndësishme, do t’ju njoftojmë përmes emailit ose me një njoftim të dukshëm në aplikacion. Vazhdimi i përdorimit të shërbimit pas hyrjes në fuqi të kushteve të reja do të konsiderohet pranim i tyre. Nëse nuk pajtoheni, ju lutemi të çaktivizoni llogarinë tuaj dhe të pushoni përdorimin.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Kontakt</h2>
          <p>
            Për pyetje në lidhje me këto Kushte të Shërbimit: <a href="mailto:support@sm-automation.com">support@sm-automation.com</a>.
          </p>
        </section>

        <p className="legal-back">
          <Link to="/" className="back-link">← Kthehu në faqen kryesore</Link>
        </p>
      </main>
    </div>
  );
}
