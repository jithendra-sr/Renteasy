document.addEventListener('DOMContentLoaded', () => {

  // ⚠️ YOUR GOOGLE APPS SCRIPT WEB APP URL
  const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyEBTb7R_QmaJBV_Au2qZIL4GhzP91ek3qhwB0yUGkEdwy2nLLcQpAdeTTktI8AHSR_/exec";

  let properties = [];

  const listingsContainer = document.getElementById('listings');
  const searchInput = document.getElementById('location-search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabSections = document.querySelectorAll('.tab-section');
  const propertyForm = document.getElementById('native-property-form');
  const formStatus = document.getElementById('form-status');

  let activeCategory = 'all';

  function getSheetValue(row, possibleKeys) {
    for (let key of possibleKeys) {
      for (let rowKey in row) {
        if (rowKey.trim().toLowerCase() === key.toLowerCase()) {
          return row[rowKey];
        }
      }
    }
    return '';
  }

  // --- 1. FETCH LIVE DATA FROM GOOGLE SHEETS ---
  async function fetchPropertiesFromSheet() {
    if (!listingsContainer) return;
    listingsContainer.innerHTML = `<p style="color:#38bdf8; text-align:center;">Loading properties from Google Sheets...</p>`;

    try {
      const response = await fetch(GOOGLE_SHEET_API_URL);
      const data = await response.json();
      
      properties = data.map((item, index) => {
        const title = getSheetValue(item, ['PROPERTY NAME', 'title', 'name']) || "Untitled Property";
        const type = getSheetValue(item, ['Property Type', 'type']) || "Commercial";
        const location = getSheetValue(item, ['PROPERTY LOCATION', 'location']) || "";
        
        let rawPhone = getSheetValue(item, ['PHOME NUMBER', 'PHONE NUMBER', 'phone', 'contact']);
        let rawPrice = getSheetValue(item, ['property price', 'price']);
        let rawImage = getSheetValue(item, ['Column 83R235235', 'images', 'image', 'photo']);

        // Fix swapped data from misaligned columns
        let price = 0;
        let phone = "";
        let imageUrl = "";

        // Detect if image URL was put in price column
        if (String(rawPrice).startsWith('http')) {
          imageUrl = rawPrice;
          price = parseFloat(rawPhone) || 0;
          phone = "";
        } else {
          price = parseFloat(rawPrice) || parseFloat(rawPhone) || 0;
          phone = String(rawPhone || "");
        }

        if (String(rawImage).startsWith('http')) {
          imageUrl = rawImage;
        }

        // Clean phone number (keep digits only)
        const cleanPhone = String(phone).replace(/[^0-9]/g, '');

        return {
          id: getSheetValue(item, ['Timestamp', 'id']) || index,
          title: title,
          type: formatPropertyType(type),
          location: location,
          price: price,
          phone: cleanPhone,
          images: imageUrl ? [imageUrl] : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop"]
        };
      });

      applyFilters();
    } catch (err) {
      console.error("Error fetching Google Sheet data:", err);
      listingsContainer.innerHTML = `<p style="color:#f87171; text-align:center;">Failed to load properties from Google Sheet.</p>`;
    }
  }

  // --- 2. TAB SWITCHING ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      if (targetTab === 'browse') {
        document.getElementById('browse-section').classList.add('active');
        fetchPropertiesFromSheet();
      } else if (targetTab === 'list') {
        document.getElementById('list-section').classList.add('active');
      }
    });
  });

  function formatPropertyType(rawType) {
    if (!rawType) return 'Commercial';
    const clean = String(rawType).trim();
    if (clean.toLowerCase() === 'office' || clean.toLowerCase() === 's') return 'Commercial';
    return clean;
  }

  // --- 3. RENDER LISTINGS & MODAL ---
  function renderListings(filteredList = properties) {
    if (!listingsContainer) return;
    listingsContainer.innerHTML = '';

    if (filteredList.length === 0) {
      listingsContainer.innerHTML = `<p style="color:#94a3b8; text-align:center;">No properties found.</p>`;
      return;
    }

    filteredList.forEach(prop => {
      const card = document.createElement('div');
      card.className = 'card';
      
      const displayType = formatPropertyType(prop.type);
      const imgMarkup = (prop.images && prop.images.length > 0)
        ? `<img src="${prop.images[0]}" alt="${prop.title}" class="card-thumb" />`
        : `<div class="no-thumb">No Image</div>`;

      card.innerHTML = `
        ${imgMarkup}
        <h3>${prop.title}</h3>
        <p style="margin: 4px 0; color: #94a3b8; font-size: 13px;"><strong>Type:</strong> ${displayType}</p>
        <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">📍 ${prop.location}</p>
        <p class="price" style="margin-top: 8px; font-weight: bold; color: #4ade80;">
          ₹${Number(prop.price).toLocaleString('en-IN')} / month
        </p>
      `;

      card.addEventListener('click', () => openPropertyModal(prop));
      listingsContainer.appendChild(card);
    });
  }

  // --- 4. DETAIL MODAL DIALOG ---
  function openPropertyModal(prop) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const displayType = formatPropertyType(prop.type);

    const imgSection = (prop.images && prop.images.length > 0)
      ? `<div class="carousel-container"><img src="${prop.images[0]}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" /></div>`
      : `<div class="no-img-modal">No Image Available</div>`;

    const formattedPhone = prop.phone ? prop.phone : null;

    const phoneSection = formattedPhone 
      ? `<p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${formattedPhone}" style="color:#38bdf8; text-decoration:none;">${formattedPhone}</a></p>
         <a href="https://wa.me/91${formattedPhone}" target="_blank" class="contact-btn">💬 Chat on WhatsApp</a>`
      : `<p style="color:#94a3b8; text-align:center; margin-top:15px; font-style:italic;">No contact number provided</p>`;

    overlay.innerHTML = `
      <div class="modal-box">
        <button class="modal-close">&times;</button>
        ${imgSection}
        <h2 style="color:#38bdf8; margin: 10px 0;">${prop.title}</h2>
        <p style="margin: 6px 0;"><strong>Type:</strong> ${displayType}</p>
        <p style="margin: 6px 0;"><strong>Location:</strong> 📍 <a href="https://maps.google.com/?q=${encodeURIComponent(prop.location)}" target="_blank" style="color:#38bdf8;">${prop.location}</a></p>
        <p class="price" style="font-size:18px; color:#4ade80; font-weight:bold; margin: 10px 0;">₹${Number(prop.price).toLocaleString('en-IN')} / month</p>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
        ${phoneSection}
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // --- 5. FILTERING & SEARCH ---
  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = properties.filter(p => {
      const displayType = formatPropertyType(p.type).toLowerCase();
      
      const matchesCategory = (activeCategory === 'all') || 
        (displayType === activeCategory.toLowerCase());
      
      const matchesSearch = (p.location && p.location.toLowerCase().includes(searchTerm)) ||
        (p.title && p.title.toLowerCase().includes(searchTerm));

      return matchesCategory && matchesSearch;
    });

    renderListings(filtered);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-type');
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // --- 6. SUBMIT TO GOOGLE SHEET & REDIRECT ---
  if (propertyForm) {
    propertyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('prop-name').value.trim();
      const rawType = document.getElementById('prop-type').value;
      const type = formatPropertyType(rawType);
      const location = document.getElementById('prop-location').value.trim();
      const price = parseFloat(document.getElementById('prop-price').value);
      const phone = document.getElementById('prop-phone').value.trim();

      if (!title || !type || !location || isNaN(price)) {
        formStatus.className = 'form-status-msg error';
        formStatus.textContent = 'Please correctly fill out all required fields.';
        return;
      }

      formStatus.className = 'form-status-msg';
      formStatus.textContent = 'Saving to Google Sheet...';

      const newProp = {
        title: title,
        type: type,
        location: location,
        phone: phone,
        price: price,
        image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop"
      };

      try {
        await fetch(GOOGLE_SHEET_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProp)
        });

        formStatus.className = 'form-status-msg success';
        formStatus.textContent = 'Property listed successfully! Redirecting to home...';

        propertyForm.reset();

        setTimeout(() => {
          formStatus.textContent = '';
          const browseTabBtn = document.querySelector('.tab-btn[data-tab="browse"]');
          if (browseTabBtn) browseTabBtn.click();
        }, 1500);

      } catch (err) {
        console.error("Error posting to Google Sheets:", err);
        formStatus.className = 'form-status-msg error';
        formStatus.textContent = 'Failed to save property. Please try again.';
      }
    });
  }

  fetchPropertiesFromSheet();
});
