    document.addEventListener("DOMContentLoaded", function () {
      /* ===== Drapeaux & FR/Étranger ===== */
      const flagIcons = {
        'pays-bas': 'https://flagcdn.com/16x12/nl.png',
        'allemagne': 'https://flagcdn.com/16x12/de.png',
        'suisse': 'https://flagcdn.com/16x12/ch.png',
        'italie': 'https://flagcdn.com/16x12/it.png',
        'r.-u.': 'https://flagcdn.com/16x12/gb.png',
        'royaume-uni': 'https://flagcdn.com/16x12/gb.png',
        'londres': 'https://flagcdn.com/16x12/gb.png',
      };
      const franceFlagUrl = 'https://flagcdn.com/16x12/fr.png';

      /* ===== Mois FR — tolérant aux accents ===== */
      const monthMap = {
        'janvier': 0, 'fevrier': 1, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'aout': 7, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10,
        'decembre': 11, 'décembre': 11
      };

      const sanitize = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const pad2 = (n) => String(n).padStart(2, '0');

      function parseDateRangeFR(txt) {
        // Nettoyage typographique : tirets, espaces multiples
        const raw = txt.trim().replace(/[—–]/g, '-').replace(/\s+/g, ' ');
        const lower = raw.toLowerCase();

        // 1) Plage : "29-31 août 2025"
        let m = lower.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([a-zéûîôà]+)\s+(\d{4})$/i);
        if (m) {
          const d1 = parseInt(m[1], 10), d2 = parseInt(m[2], 10);
          const monthName = m[3];
          const year = parseInt(m[4], 10);
          const mi = monthMap[sanitize(monthName)];
          if (mi == null) return null;
          const start = new Date(year, mi, d1);
          const endInc = new Date(year, mi, d2);
          const endExclusive = new Date(endInc); endExclusive.setDate(endInc.getDate() + 1);
          return {
            startYMD: `${start.getFullYear()}${pad2(start.getMonth() + 1)}${pad2(start.getDate())}`,
            endYMD_excl: `${endExclusive.getFullYear()}${pad2(endExclusive.getMonth() + 1)}${pad2(endExclusive.getDate())}`,
            startDate: start
          };
        }

        // 2) Simple : "7 septembre 2025"
        m = lower.match(/^(\d{1,2})\s+([a-zéûîôà]+)\s+(\d{4})$/i);
        if (m) {
          const d = parseInt(m[1], 10);
          const monthName = m[2];
          const year = parseInt(m[3], 10);
          const mi = monthMap[sanitize(monthName)];
          if (mi == null) return null;
          const start = new Date(year, mi, d);
          const endExclusive = new Date(start); endExclusive.setDate(start.getDate() + 1);
          return {
            startYMD: `${start.getFullYear()}${pad2(start.getMonth() + 1)}${pad2(start.getDate())}`,
            endYMD_excl: `${endExclusive.getFullYear()}${pad2(endExclusive.getMonth() + 1)}${pad2(endExclusive.getDate())}`,
            startDate: start
          };
        }
        return null;
      }

      function icsEscape(str = '') {
        return String(str)
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/,/g, '\\,')
          .replace(/;/g, '\\;');
      }

      function nowUTCStamp() {
        const d = new Date();
        const y = d.getUTCFullYear();
        const mo = pad2(d.getUTCMonth() + 1);
        const da = pad2(d.getUTCDate());
        const h = pad2(d.getUTCHours());
        const mi = pad2(d.getUTCMinutes());
        const s = pad2(d.getUTCSeconds());
        return `${y}${mo}${da}T${h}${mi}${s}Z`;
      }

      function buildIcsSingle({ summary, location, description, url, startYMD, endYMD_excl, uid }) {
        const lines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Agenda Bourses Horlogères//FR',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${icsEscape(uid)}`,
          `DTSTAMP:${nowUTCStamp()}`,
          `DTSTART;VALUE=DATE:${startYMD}`,
          `DTEND;VALUE=DATE:${endYMD_excl}`,
          `SUMMARY:${icsEscape(summary)}`,
          location ? `LOCATION:${icsEscape(location)}` : '',
          description ? `DESCRIPTION:${icsEscape(description)}` : '',
          url ? `URL:${icsEscape(url)}` : '',
          'END:VEVENT',
          'END:VCALENDAR'
        ].filter(Boolean);
        return lines.join('\r\n');
      }

      function buildIcsMultiple(vevents) {
        const lines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Agenda Bourses Horlogères//FR',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH'
        ];
        vevents.forEach(v => {
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${icsEscape(v.uid)}`);
          lines.push(`DTSTAMP:${nowUTCStamp()}`);
          lines.push(`DTSTART;VALUE=DATE:${v.startYMD}`);
          lines.push(`DTEND;VALUE=DATE:${v.endYMD_excl}`);
          lines.push(`SUMMARY:${icsEscape(v.summary)}`);
          if (v.location) lines.push(`LOCATION:${icsEscape(v.location)}`);
          if (v.description) lines.push(`DESCRIPTION:${icsEscape(v.description)}`);
          if (v.url) lines.push(`URL:${icsEscape(v.url)}`);
          lines.push('END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
      }

      function makeDownloadLink(filename, mime, content) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        return a;
      }

      function buildGoogleLink({ summary, location, description, startYMD, endYMD_excl }) {
        const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams({
          text: summary || '',
          dates: `${startYMD}/${endYMD_excl}`,
          location: location || '',
          details: description || ''
        });
        return `${base}&${params.toString()}`;
      }

      /* ===== Marquage passé/à venir + Drapeaux + Boutons Calendrier ===== */
      function enhanceTable(table) {
        const tbody = table.querySelector('tbody');
        const headerRow = table.querySelector('thead tr');
        if (!tbody || !headerRow) return [];

        if (!headerRow.querySelector('.th-calendrier')) {
          const thCal = document.createElement('th');
          thCal.className = 'th-calendrier';
          thCal.textContent = 'Calendrier';
          headerRow.appendChild(thCal);
        }

        const eventsForExport = [];

        tbody.querySelectorAll('tr').forEach(row => {
          const dateText = row.cells[0].innerText.trim();
          const locCell = row.cells[1];
          const addrCell = row.cells[2];
          const contactCell = row.cells[3];
          const tarifCell = row.cells[4];
          const siteCell = row.cells[5];

          const parsed = parseDateRangeFR(dateText);

          let locationText = locCell.innerText;
          let locationLower = locationText.toLowerCase();
          let matchedForeign = false;
          for (const [countryKey, iconUrl] of Object.entries(flagIcons)) {
            if (locationLower.includes(countryKey)) {
              locCell.innerHTML = locationText +
                ' <img src="' + iconUrl + '" alt="' + countryKey + '" style="margin-left:5px; vertical-align:middle;">';
              row.classList.add('foreign-event');
              matchedForeign = true;
              break;
            }
          }
          if (!matchedForeign) {
            locCell.innerHTML = locationText +
              ' <img src="' + franceFlagUrl + '" alt="France" style="margin-left:5px; vertical-align:middle;">';
            row.classList.add('french-event');
          }

          const calTd = document.createElement('td');
          calTd.className = 'cal-actions';

          if (parsed) {
            const summary = `Bourse horlogère — ${locationText.replace(/\s*\(.*?\)\s*/, '').trim()}`;
            const location = addrCell.innerText.trim();
            const siteLinkEl = siteCell.querySelector('a');
            const url = siteLinkEl ? siteLinkEl.href : '';
            const details = [
              tarifCell?.innerText?.trim() ? `Tarif: ${tarifCell.innerText.trim()}` : '',
              contactCell?.innerText?.trim() ? `Contact: ${contactCell.innerText.trim()}` : '',
              url ? `Détails: ${url}` : '',
              `Source: L'agenda des bourses horlogères`
            ].filter(Boolean).join('\\n');

            const uid = `${parsed.startYMD}-${sanitize(locationText).replace(/\W+/g, '-')}@agenda-bourses`;
            const ics = buildIcsSingle({
              summary, location, description: details, url,
              startYMD: parsed.startYMD, endYMD_excl: parsed.endYMD_excl, uid
            });

            const icsLink = makeDownloadLink(
              `${summary.replace(/\s+/g, '_')}.ics`, 'text/calendar', ics
            );
            icsLink.textContent = 'iCal (.ics)';

            const gcalLink = document.createElement('a');
            gcalLink.href = buildGoogleLink({ summary, location, description: details, startYMD: parsed.startYMD, endYMD_excl: parsed.endYMD_excl });
            gcalLink.target = '_blank';
            gcalLink.rel = 'noopener';
            gcalLink.textContent = 'Google';

            calTd.appendChild(icsLink);
            calTd.appendChild(gcalLink);
            row.appendChild(calTd);

            if (table.dataset.variant === 'upcoming') {
              eventsForExport.push({
                summary, location, description: details, url,
                startYMD: parsed.startYMD, endYMD_excl: parsed.endYMD_excl,
                uid
              });
            }
          } else {
            calTd.textContent = '—';
            row.appendChild(calTd);
          }
        });

        return eventsForExport;
      }

      const allEventsForMasterICS = [];
      document.querySelectorAll('.agenda-table').forEach((table) => {
        allEventsForMasterICS.push(...enhanceTable(table));
      });

      const actionsBar = document.querySelector('.agenda-actions[data-scope="upcoming"]');
      if (actionsBar && allEventsForMasterICS.length) {
        const btnAll = document.createElement('a');
        btnAll.href = '#';
        btnAll.className = 'btn';
        btnAll.textContent = 'Exporter les prochaines (.ics)';
        btnAll.addEventListener('click', (e) => {
          e.preventDefault();
          const icsAll = buildIcsMultiple(allEventsForMasterICS);
          const link = makeDownloadLink('Agenda-bourses-a-venir.ics', 'text/calendar', icsAll);
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
        actionsBar.appendChild(btnAll);
      }
    });
