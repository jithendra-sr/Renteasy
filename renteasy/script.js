document.addEventListener('DOMContentLoaded', () => {

  const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyreR0QIWehXaA6jcugjEGlr3ZEkTt9si5h8lsd8L1QlWiBp5m3VotYnpITCLZvYBOU/exec";

  let properties = [];
  let pollInterval = null;

  const listingsContainer = document.getElementById('listings');
  const searchInput = document.getElementById('location-search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabSections = document.querySelectorAll('.tab-section');

  let activeCategory = 'all';

  function updateResponseCounterUI(count) {
    const counterElements = document.querySelectorAll('#propertyCount, #responseCount, .property-count, .response-count');
    counterElements.forEach(el => {
      el.innerText = count;
    });
  }

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

  function formatPropertyType(rawType) {
    if (!rawType) return 'Commercial';
    const clean = String(rawType).trim();
    if (clean.toLowerCase() === 'office' || clean.toLowerCase() === 's') return 'Commercial';
    return clean;
  }

  async function fetchPropertiesFromSheet() {
    if (!listingsContainer) return;
    listingsContainer.innerHTML = `<p style="color:#38bdf8; text-align:center;">Loading properties...</p>`;

    try {
      const response = await fetch(GOOGLE_SHEET_API_URL);
      const data = await response.json();
      
      const validProperties = Array.isArray(data) ? data.filter(item => {
        const type = getSheetValue(item, ['Property Type', 'type']);
        return String(type).toUpperCase() !== 'ENQUIRY';
      }) : [];

      updateResponseCounterUI(validProperties.length);

      properties = validProperties.map((item, index) => {
        const title = getSheetValue(item, ['PROPERTY NAME', 'title', 'name']) || "Untitled Property";
        const type = getSheetValue(item, ['Property Type', 'type']) || "Commercial";
        const location = getSheetValue(item, ['PROPERTY LOCATION', 'location']) || "Location Not Provided";
        
        let rawPhone = getSheetValue(item, ['PHOME NUMBER', 'PHONE NUMBER', 'phone', 'contact']);
        let rawPrice = getSheetValue(item, ['property price', 'price']);
        let rawImage = getSheetValue(item, ['UPLOAD YOUR PROPERTY IMAGES', 'images', 'image', 'photo']);

        let price = parseFloat(rawPrice) || parseFloat(rawPhone) || 0;
        let phone = String(rawPhone || "").replace(/[^0-9]/g, '');
        let imageUrl = String(rawImage).startsWith('http') ? rawImage : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop";

        return {
          id: index,
          title: title,
          type: formatPropertyType(type),
          location: location,
          price: price,
          phone: phone,
          images: [imageUrl]
        };
      });

      applyFilters();
    } catch (err) {
      console.error("Error fetching sheet:", err);
      listingsContainer.innerHTML = `<p style="color:#f87171; text-align:center;">Failed to load properties.</p>`;
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      if (targetTab === 'browse') {
        const browseSec = document.getElementById('browse-section');
        if (browseSec) browseSec.classList.add('active');
        fetchPropertiesFromSheet();
      } else if (targetTab === 'list') {
        const listSec = document.getElementById('list-section');
        if (listSec) listSec.classList.add('active');
      }
    });
  });

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
      const imgMarkup = `<img src="${prop.images[0]}" alt="${prop.title}" class="card-thumb" />`;

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

  function openPropertyModal(prop) {
    if (pollInterval) clearInterval(pollInterval);

    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const displayType = formatPropertyType(prop.type);
    const savedPhone = localStorage.getItem('renteasy_user_phone') || '';

    overlay.innerHTML = `
      <div class="modal-box">
        <button class="modal-close">&times;</button>
        <div class="carousel-container">
          <img src="${prop.images[0]}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />
        </div>
        <h2 style="color:#38bdf8; margin: 10px 0;">${prop.title}</h2>
        <p style="margin: 6px 0;"><strong>Property Type:</strong> ${displayType}</p>
        <p style="margin: 6px 0;"><strong>Location:</strong> 📍 <a href="https://maps.google.com/?q=${encodeURIComponent(prop.location)}" target="_blank" style="color:#38bdf8;">${prop.location}</a></p>
        <p class="price" style="font-size:18px; color:#4ade80; font-weight:bold; margin: 10px 0;">Price: ₹${Number(prop.price).toLocaleString('en-IN')} / month</p>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
        
        <div id="enquiry-container" style="text-align: center;">
          <button id="more-enquiry-btn" style="
            width: 100%; padding: 12px; background-color: #38bdf8; color: #0f172a;
            font-weight: bold; font-size: 15px; border: none; border-radius: 8px; cursor: pointer;
            transition: background-color 0.2s ease;
          ">
            📩 More Enquiry
          </button>

          <!-- Smooth Sliding Container -->
          <div id="slide-wrapper" style="max-height: 0px; overflow: hidden; transition: max-height 0.4s ease-in-out, opacity 0.3s ease; opacity: 0;">
            <div id="enquiry-form" style="margin-top: 15px; text-align: left;">
              <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 8px;">Enter your phone number to submit enquiry:</p>
              <input type="text" id="cust-phone" value="" placeholder="Your Phone Number" autocomplete="off" style="width: 100%; padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: white;" />
              <button id="submit-enquiry-btn" style="width: 100%; padding: 10px; background-color: #22c55e; color: white; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">Submit Enquiry</button>
              <p id="enquiry-status-msg" style="font-size: 13px; margin-top: 8px; text-align: center;"></p>
            </div>

            <div id="waiting-loader" style="display: none; margin-top: 15px; text-align: center;">
              <p style="color: #facc15; font-weight: bold; font-size: 14px;">⏳ Request Sent! Waiting for Owner Approval...</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Contact details will reveal automatically once approved.</p>
            </div>

            <div id="contact-details" style="display: none; margin-top: 15px; text-align: left; background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #22c55e;">
              <p style="color: #4ade80; font-weight: bold; text-align: center; margin-bottom: 8px; font-size: 16px;">✅ Access Approved!</p>
              ${prop.phone ? `
                <p style="margin: 8px 0; font-size: 15px;"><strong>Phone:</strong> <a href="tel:${prop.phone}" style="color:#38bdf8;">${prop.phone}</a></p>
                <a href="https://wa.me/91${prop.phone}" target="_blank" style="display: block; text-align: center; background-color: #22c55e; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">💬 Chat on WhatsApp</a>
              ` : `<p style="color:#94a3b8; text-align:center;">No contact number provided</p>`}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const enquiryBtn = overlay.querySelector('#more-enquiry-btn');
    const slideWrapper = overlay.querySelector('#slide-wrapper');
    const enquiryForm = overlay.querySelector('#enquiry-form');
    const submitEnquiryBtn = overlay.querySelector('#submit-enquiry-btn');
    const custPhoneInput = overlay.querySelector('#cust-phone');
    const statusMsg = overlay.querySelector('#enquiry-status-msg');
    const waitingLoader = overlay.querySelector('#waiting-loader');
    const contactDetails = overlay.querySelector('#contact-details');

    const startPolling = (phone) => {
      enquiryForm.style.display = 'none';
      waitingLoader.style.display = 'block';

      pollInterval = setInterval(async () => {
        try {
          const checkRes = await fetch(`${GOOGLE_SHEET_API_URL}?action=checkStatus&phone=${encodeURIComponent(phone)}&title=${encodeURIComponent(prop.title)}`);
          const statusData = await checkRes.json();

          if (statusData.status === "APPROVED") {
            clearInterval(pollInterval);
            waitingLoader.style.display = 'none';
            contactDetails.style.display = 'block';
          }
        } catch (err) {
          console.error("Checking status...", err);
        }
      }, 3000);
    };

    enquiryBtn.addEventListener('click', async () => {
      // Smooth slide toggle open
      enquiryBtn.style.display = 'none';
      slideWrapper.style.maxHeight = '300px';
      slideWrapper.style.opacity = '1';

      // Ensure input is empty on expand
      custPhoneInput.value = '';

      if (savedPhone) {
        try {
          const checkRes = await fetch(`${GOOGLE_SHEET_API_URL}?action=checkStatus&phone=${encodeURIComponent(savedPhone)}&title=${encodeURIComponent(prop.title)}`);
          const statusData = await checkRes.json();

          if (statusData.status === "APPROVED") {
            enquiryForm.style.display = 'none';
            contactDetails.style.display = 'block';
            return;
          } else if (statusData.status === "PENDING") {
            startPolling(savedPhone);
            return;
          }
        } catch (e) { console.error(e); }
      }
    });

    submitEnquiryBtn.addEventListener('click', async () => {
      const phoneVal = custPhoneInput.value.trim();
      if (!phoneVal || phoneVal.length < 10) {
        statusMsg.style.color = '#f87171';
        statusMsg.innerText = 'Please enter a valid phone number.';
        return;
      }

      localStorage.setItem('renteasy_user_phone', phoneVal);

      submitEnquiryBtn.disabled = true;
      submitEnquiryBtn.innerText = 'Sending...';

      try {
        await fetch(GOOGLE_SHEET_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: "ENQUIRY",
            type: "ENQUIRY",
            customerPhone: phoneVal,
            propertyTitle: prop.title
          })
        });

        startPolling(phoneVal);

      } catch (err) {
        console.error(err);
        statusMsg.style.color = '#f87171';
        statusMsg.innerText = 'Failed to send request. Try again.';
        submitEnquiryBtn.disabled = false;
        submitEnquiryBtn.innerText = 'Submit Enquiry';
      }
    });

    const closeModal = () => {
      if (pollInterval) clearInterval(pollInterval);
      overlay.remove();
    };

    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = properties.filter(p => {
      const displayType = formatPropertyType(p.type).toLowerCase();
      const matchesCategory = (activeCategory === 'all') || (displayType === activeCategory.toLowerCase());
      const matchesSearch = (p.location && p.location.toLowerCase().includes(searchTerm)) || (p.title && p.title.toLowerCase().includes(searchTerm));
      return matchesCategory && matchesSearch;
    });

    renderListings(filtered);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-type') || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  fetchPropertiesFromSheet();
});
