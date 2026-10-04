/**
 * indiaCities.js
 * Comprehensive static local dataset of Indian cities and towns with coarse approximate coordinates
 * for stylized paper-plane route animation in Discuss Letters.
 * 
 * NO live GPS, NO exact coordinates, NO user movement tracking.
 * Compact, fast local searching with normalized index and "Other" custom city support.
 */

export const INDIA_CITIES = Object.freeze([
  // Tier 1 & Tech Hubs
  { id: 'bengaluru', city: 'Bengaluru', state: 'Karnataka', normalizedName: 'bengaluru bangalore', coarseLat: 12.9716, coarseLng: 77.5946 },
  { id: 'mumbai', city: 'Mumbai', state: 'Maharashtra', normalizedName: 'mumbai bombay', coarseLat: 19.0760, coarseLng: 72.8777 },
  { id: 'delhi', city: 'Delhi', state: 'Delhi NCR', normalizedName: 'delhi', coarseLat: 28.6139, coarseLng: 77.2090 },
  { id: 'hyderabad', city: 'Hyderabad', state: 'Telangana', normalizedName: 'hyderabad', coarseLat: 17.3850, coarseLng: 78.4867 },
  { id: 'chennai', city: 'Chennai', state: 'Tamil Nadu', normalizedName: 'chennai madras', coarseLat: 13.0827, coarseLng: 80.2707 },
  { id: 'pune', city: 'Pune', state: 'Maharashtra', normalizedName: 'pune', coarseLat: 18.5204, coarseLng: 73.8567 },
  { id: 'kolkata', city: 'Kolkata', state: 'West Bengal', normalizedName: 'kolkata calcutta', coarseLat: 22.5726, coarseLng: 88.3639 },
  { id: 'ahmedabad', city: 'Ahmedabad', state: 'Gujarat', normalizedName: 'ahmedabad', coarseLat: 23.0225, coarseLng: 72.5714 },
  { id: 'noida', city: 'Noida', state: 'Uttar Pradesh', normalizedName: 'noida', coarseLat: 28.5355, coarseLng: 77.3910 },
  { id: 'gurugram', city: 'Gurugram', state: 'Haryana', normalizedName: 'gurugram', coarseLat: 28.4595, coarseLng: 77.0266 },

  // Karnataka
  { id: 'mysuru', city: 'Mysuru', state: 'Karnataka', normalizedName: 'mysuru', coarseLat: 12.2958, coarseLng: 76.6394 },
  { id: 'mangalore', city: 'Mangalore', state: 'Karnataka', normalizedName: 'mangalore', coarseLat: 12.9141, coarseLng: 74.8560 },
  { id: 'hubballi', city: 'Hubballi-Dharwad', state: 'Karnataka', normalizedName: 'hubballi dharwad', coarseLat: 15.3647, coarseLng: 75.1240 },
  { id: 'belagavi', city: 'Belagavi', state: 'Karnataka', normalizedName: 'belagavi', coarseLat: 15.8497, coarseLng: 74.4977 },
  { id: 'kalaburagi', city: 'Kalaburagi', state: 'Karnataka', normalizedName: 'kalaburagi', coarseLat: 17.3297, coarseLng: 76.8343 },
  { id: 'ballari', city: 'Ballari', state: 'Karnataka', normalizedName: 'ballari', coarseLat: 15.1394, coarseLng: 76.9214 },
  { id: 'shivamogga', city: 'Shivamogga', state: 'Karnataka', normalizedName: 'shivamogga', coarseLat: 13.9299, coarseLng: 75.5681 },
  { id: 'tumakuru', city: 'Tumakuru', state: 'Karnataka', normalizedName: 'tumakuru', coarseLat: 13.3379, coarseLng: 77.1173 },
  { id: 'davangere', city: 'Davangere', state: 'Karnataka', normalizedName: 'davangere', coarseLat: 14.4644, coarseLng: 75.9218 },
  { id: 'udupi', city: 'Udupi', state: 'Karnataka', normalizedName: 'udupi', coarseLat: 13.3409, coarseLng: 74.7421 },
  { id: 'hassan', city: 'Hassan', state: 'Karnataka', normalizedName: 'hassan', coarseLat: 13.0033, coarseLng: 76.1004 },
  { id: 'bidar', city: 'Bidar', state: 'Karnataka', normalizedName: 'bidar', coarseLat: 17.9104, coarseLng: 77.5199 },
  { id: 'vijayapura', city: 'Vijayapura', state: 'Karnataka', normalizedName: 'vijayapura', coarseLat: 16.8302, coarseLng: 75.7100 },

  // Maharashtra
  { id: 'nagpur', city: 'Nagpur', state: 'Maharashtra', normalizedName: 'nagpur', coarseLat: 21.1458, coarseLng: 79.0882 },
  { id: 'nashik', city: 'Nashik', state: 'Maharashtra', normalizedName: 'nashik', coarseLat: 19.9975, coarseLng: 73.7898 },
  { id: 'thane', city: 'Thane', state: 'Maharashtra', normalizedName: 'thane', coarseLat: 19.2183, coarseLng: 72.9781 },
  { id: 'chhatrapati_sambhajinagar', city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', normalizedName: 'chhatrapati sambhajinagar aurangabad', coarseLat: 19.8762, coarseLng: 75.3433 },
  { id: 'solapur', city: 'Solapur', state: 'Maharashtra', normalizedName: 'solapur', coarseLat: 17.6599, coarseLng: 75.9064 },
  { id: 'kolhapur', city: 'Kolhapur', state: 'Maharashtra', normalizedName: 'kolhapur', coarseLat: 16.7050, coarseLng: 74.2433 },
  { id: 'navi_mumbai', city: 'Navi Mumbai', state: 'Maharashtra', normalizedName: 'navi mumbai', coarseLat: 19.0330, coarseLng: 73.0297 },
  { id: 'amravati', city: 'Amravati', state: 'Maharashtra', normalizedName: 'amravati', coarseLat: 20.9374, coarseLng: 77.7796 },
  { id: 'nanded', city: 'Nanded', state: 'Maharashtra', normalizedName: 'nanded', coarseLat: 19.1383, coarseLng: 77.3210 },
  { id: 'jalgaon', city: 'Jalgaon', state: 'Maharashtra', normalizedName: 'jalgaon', coarseLat: 21.0077, coarseLng: 75.5626 },
  { id: 'akola', city: 'Akola', state: 'Maharashtra', normalizedName: 'akola', coarseLat: 20.7002, coarseLng: 77.0082 },
  { id: 'latur', city: 'Latur', state: 'Maharashtra', normalizedName: 'latur', coarseLat: 18.4088, coarseLng: 76.5604 },
  { id: 'dhule', city: 'Dhule', state: 'Maharashtra', normalizedName: 'dhule', coarseLat: 20.9042, coarseLng: 74.7749 },
  { id: 'ahmednagar', city: 'Ahilyanagar', state: 'Maharashtra', normalizedName: 'ahilyanagar ahmednagar', coarseLat: 19.0948, coarseLng: 74.7480 },
  { id: 'chandrapur', city: 'Chandrapur', state: 'Maharashtra', normalizedName: 'chandrapur', coarseLat: 19.9615, coarseLng: 79.2961 },

  // Tamil Nadu
  { id: 'coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', normalizedName: 'coimbatore', coarseLat: 11.0168, coarseLng: 76.9558 },
  { id: 'madurai', city: 'Madurai', state: 'Tamil Nadu', normalizedName: 'madurai', coarseLat: 9.9252, coarseLng: 78.1198 },
  { id: 'tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu', normalizedName: 'tiruchirappalli trichy', coarseLat: 10.7905, coarseLng: 78.7047 },
  { id: 'salem', city: 'Salem', state: 'Tamil Nadu', normalizedName: 'salem', coarseLat: 11.6643, coarseLng: 78.1460 },
  { id: 'tirunelveli', city: 'Tirunelveli', state: 'Tamil Nadu', normalizedName: 'tirunelveli', coarseLat: 8.7139, coarseLng: 77.7567 },
  { id: 'tiruppur', city: 'Tiruppur', state: 'Tamil Nadu', normalizedName: 'tiruppur', coarseLat: 11.1085, coarseLng: 77.3411 },
  { id: 'erode', city: 'Erode', state: 'Tamil Nadu', normalizedName: 'erode', coarseLat: 11.3410, coarseLng: 77.7172 },
  { id: 'vellore', city: 'Vellore', state: 'Tamil Nadu', normalizedName: 'vellore', coarseLat: 12.9165, coarseLng: 79.1325 },
  { id: 'thoothukudi', city: 'Thoothukudi', state: 'Tamil Nadu', normalizedName: 'thoothukudi tuticorin', coarseLat: 8.7642, coarseLng: 78.1348 },
  { id: 'dindigul', city: 'Dindigul', state: 'Tamil Nadu', normalizedName: 'dindigul', coarseLat: 10.3673, coarseLng: 77.9803 },
  { id: 'thanjavur', city: 'Thanjavur', state: 'Tamil Nadu', normalizedName: 'thanjavur', coarseLat: 10.7870, coarseLng: 79.1378 },
  { id: 'hosur', city: 'Hosur', state: 'Tamil Nadu', normalizedName: 'hosur', coarseLat: 12.7409, coarseLng: 77.8253 },
  { id: 'kanyakumari', city: 'Kanyakumari', state: 'Tamil Nadu', normalizedName: 'kanyakumari nagercoil', coarseLat: 8.0883, coarseLng: 77.5385 },

  // Kerala
  { id: 'kochi', city: 'Kochi', state: 'Kerala', normalizedName: 'kochi cochin', coarseLat: 9.9312, coarseLng: 76.2673 },
  { id: 'thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala', normalizedName: 'thiruvananthapuram trivandrum', coarseLat: 8.5241, coarseLng: 76.9366 },
  { id: 'kozhikode', city: 'Kozhikode', state: 'Kerala', normalizedName: 'kozhikode calicut', coarseLat: 11.2588, coarseLng: 75.7804 },
  { id: 'thrissur', city: 'Thrissur', state: 'Kerala', normalizedName: 'thrissur', coarseLat: 10.5276, coarseLng: 76.2144 },
  { id: 'kollam', city: 'Kollam', state: 'Kerala', normalizedName: 'kollam quilon', coarseLat: 8.8932, coarseLng: 76.6141 },
  { id: 'kannur', city: 'Kannur', state: 'Kerala', normalizedName: 'kannur', coarseLat: 11.8745, coarseLng: 75.3704 },
  { id: 'alappuzha', city: 'Alappuzha', state: 'Kerala', normalizedName: 'alappuzha alleppey', coarseLat: 9.4981, coarseLng: 76.3388 },
  { id: 'palakkad', city: 'Palakkad', state: 'Kerala', normalizedName: 'palakkad', coarseLat: 10.7867, coarseLng: 76.6548 },
  { id: 'kottayam', city: 'Kottayam', state: 'Kerala', normalizedName: 'kottayam', coarseLat: 9.5916, coarseLng: 76.5222 },
  { id: 'malappuram', city: 'Malappuram', state: 'Kerala', normalizedName: 'malappuram', coarseLat: 11.0510, coarseLng: 76.0711 },

  // Telangana & Andhra Pradesh
  { id: 'warangal', city: 'Warangal', state: 'Telangana', normalizedName: 'warangal', coarseLat: 17.9689, coarseLng: 79.5941 },
  { id: 'nizamabad', city: 'Nizamabad', state: 'Telangana', normalizedName: 'nizamabad', coarseLat: 18.6725, coarseLng: 78.0941 },
  { id: 'karimnagar', city: 'Karimnagar', state: 'Telangana', normalizedName: 'karimnagar', coarseLat: 18.4386, coarseLng: 79.1288 },
  { id: 'khammam', city: 'Khammam', state: 'Telangana', normalizedName: 'khammam', coarseLat: 17.2473, coarseLng: 80.1514 },
  { id: 'visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh', normalizedName: 'visakhapatnam vizag', coarseLat: 17.6868, coarseLng: 83.2185 },
  { id: 'vijayawada', city: 'Vijayawada', state: 'Andhra Pradesh', normalizedName: 'vijayawada', coarseLat: 16.5062, coarseLng: 80.6480 },
  { id: 'guntur', city: 'Guntur', state: 'Andhra Pradesh', normalizedName: 'guntur', coarseLat: 16.3067, coarseLng: 80.4365 },
  { id: 'nellore', city: 'Nellore', state: 'Andhra Pradesh', normalizedName: 'nellore', coarseLat: 14.4426, coarseLng: 79.9865 },
  { id: 'kurnool', city: 'Kurnool', state: 'Andhra Pradesh', normalizedName: 'kurnool', coarseLat: 15.8281, coarseLng: 78.0373 },
  { id: 'rajahmundry', city: 'Rajahmundry', state: 'Andhra Pradesh', normalizedName: 'rajahmundry', coarseLat: 17.0005, coarseLng: 81.8040 },
  { id: 'tirupati', city: 'Tirupati', state: 'Andhra Pradesh', normalizedName: 'tirupati', coarseLat: 13.6288, coarseLng: 79.4192 },
  { id: 'kakinada', city: 'Kakinada', state: 'Andhra Pradesh', normalizedName: 'kakinada', coarseLat: 16.9891, coarseLng: 82.2475 },
  { id: 'anantapur', city: 'Anantapur', state: 'Andhra Pradesh', normalizedName: 'anantapur', coarseLat: 14.6819, coarseLng: 77.6006 },
  { id: 'kadapa', city: 'Kadapa', state: 'Andhra Pradesh', normalizedName: 'kadapa cuddapah', coarseLat: 14.4673, coarseLng: 78.8242 },

  // Gujarat
  { id: 'surat', city: 'Surat', state: 'Gujarat', normalizedName: 'surat', coarseLat: 21.1702, coarseLng: 72.8311 },
  { id: 'vadodara', city: 'Vadodara', state: 'Gujarat', normalizedName: 'vadodara baroda', coarseLat: 22.3072, coarseLng: 73.1812 },
  { id: 'rajkot', city: 'Rajkot', state: 'Gujarat', normalizedName: 'rajkot', coarseLat: 22.3039, coarseLng: 70.8022 },
  { id: 'bhavnagar', city: 'Bhavnagar', state: 'Gujarat', normalizedName: 'bhavnagar', coarseLat: 21.7645, coarseLng: 72.1519 },
  { id: 'jamnagar', city: 'Jamnagar', state: 'Gujarat', normalizedName: 'jamnagar', coarseLat: 22.4707, coarseLng: 70.0577 },
  { id: 'junagadh', city: 'Junagadh', state: 'Gujarat', normalizedName: 'junagadh', coarseLat: 21.5222, coarseLng: 70.4579 },
  { id: 'gandhinagar', city: 'Gandhinagar', state: 'Gujarat', normalizedName: 'gandhinagar', coarseLat: 23.2156, coarseLng: 72.6369 },
  { id: 'anand', city: 'Anand', state: 'Gujarat', normalizedName: 'anand', coarseLat: 22.5645, coarseLng: 72.9289 },
  { id: 'navsari', city: 'Navsari', state: 'Gujarat', normalizedName: 'navsari', coarseLat: 20.9500, coarseLng: 72.9333 },
  { id: 'morbi', city: 'Morbi', state: 'Gujarat', normalizedName: 'morbi', coarseLat: 22.8173, coarseLng: 70.8370 },

  // Rajasthan
  { id: 'jaipur', city: 'Jaipur', state: 'Rajasthan', normalizedName: 'jaipur', coarseLat: 26.9124, coarseLng: 75.7873 },
  { id: 'jodhpur', city: 'Jodhpur', state: 'Rajasthan', normalizedName: 'jodhpur', coarseLat: 26.2389, coarseLng: 73.0243 },
  { id: 'kota', city: 'Kota', state: 'Rajasthan', normalizedName: 'kota', coarseLat: 25.2138, coarseLng: 75.8648 },
  { id: 'bikaner', city: 'Bikaner', state: 'Rajasthan', normalizedName: 'bikaner', coarseLat: 28.0229, coarseLng: 73.3119 },
  { id: 'ajmer', city: 'Ajmer', state: 'Rajasthan', normalizedName: 'ajmer', coarseLat: 26.4499, coarseLng: 74.6399 },
  { id: 'udaipur', city: 'Udaipur', state: 'Rajasthan', normalizedName: 'udaipur', coarseLat: 24.5854, coarseLng: 73.7125 },
  { id: 'bhilwara', city: 'Bhilwara', state: 'Rajasthan', normalizedName: 'bhilwara', coarseLat: 25.3407, coarseLng: 74.6313 },
  { id: 'alwar', city: 'Alwar', state: 'Rajasthan', normalizedName: 'alwar', coarseLat: 27.5530, coarseLng: 76.6346 },
  { id: 'sikar', city: 'Sikar', state: 'Rajasthan', normalizedName: 'sikar', coarseLat: 27.6094, coarseLng: 75.1398 },

  // Uttar Pradesh
  { id: 'lucknow', city: 'Lucknow', state: 'Uttar Pradesh', normalizedName: 'lucknow', coarseLat: 26.8467, coarseLng: 80.9462 },
  { id: 'kanpur', city: 'Kanpur', state: 'Uttar Pradesh', normalizedName: 'kanpur', coarseLat: 26.4499, coarseLng: 80.3319 },
  { id: 'ghaziabad', city: 'Ghaziabad', state: 'Uttar Pradesh', normalizedName: 'ghaziabad', coarseLat: 28.6692, coarseLng: 77.4538 },
  { id: 'agra', city: 'Agra', state: 'Uttar Pradesh', normalizedName: 'agra', coarseLat: 27.1767, coarseLng: 78.0081 },
  { id: 'varanasi', city: 'Varanasi', state: 'Uttar Pradesh', normalizedName: 'varanasi benaras kashi', coarseLat: 25.3176, coarseLng: 82.9739 },
  { id: 'meerut', city: 'Meerut', state: 'Uttar Pradesh', normalizedName: 'meerut', coarseLat: 28.9845, coarseLng: 77.7064 },
  { id: 'prayagraj', city: 'Prayagraj', state: 'Uttar Pradesh', normalizedName: 'prayagraj allahabad', coarseLat: 25.4358, coarseLng: 81.8463 },
  { id: 'bareilly', city: 'Bareilly', state: 'Uttar Pradesh', normalizedName: 'bareilly', coarseLat: 28.3670, coarseLng: 79.4304 },
  { id: 'aligarh', city: 'Aligarh', state: 'Uttar Pradesh', normalizedName: 'aligarh', coarseLat: 27.8974, coarseLng: 78.0880 },
  { id: 'moradabad', city: 'Moradabad', state: 'Uttar Pradesh', normalizedName: 'moradabad', coarseLat: 28.8386, coarseLng: 78.7733 },
  { id: 'saharanpur', city: 'Saharanpur', state: 'Uttar Pradesh', normalizedName: 'saharanpur', coarseLat: 29.9671, coarseLng: 77.5452 },
  { id: 'gorakhpur', city: 'Gorakhpur', state: 'Uttar Pradesh', normalizedName: 'gorakhpur', coarseLat: 26.7606, coarseLng: 83.3732 },
  { id: 'firozabad', city: 'Firozabad', state: 'Uttar Pradesh', normalizedName: 'firozabad', coarseLat: 27.1592, coarseLng: 78.3957 },
  { id: 'jhansi', city: 'Jhansi', state: 'Uttar Pradesh', normalizedName: 'jhansi', coarseLat: 25.4484, coarseLng: 78.5685 },
  { id: 'muzaffarnagar', city: 'Muzaffarnagar', state: 'Uttar Pradesh', normalizedName: 'muzaffarnagar', coarseLat: 29.4727, coarseLng: 77.7085 },
  { id: 'mathura', city: 'Mathura', state: 'Uttar Pradesh', normalizedName: 'mathura vrindavan', coarseLat: 27.4924, coarseLng: 77.6737 },
  { id: 'ayodhya', city: 'Ayodhya', state: 'Uttar Pradesh', normalizedName: 'ayodhya faizabad', coarseLat: 26.7922, coarseLng: 82.1998 },

  // Madhya Pradesh
  { id: 'indore', city: 'Indore', state: 'Madhya Pradesh', normalizedName: 'indore', coarseLat: 22.7196, coarseLng: 75.8577 },
  { id: 'bhopal', city: 'Bhopal', state: 'Madhya Pradesh', normalizedName: 'bhopal', coarseLat: 23.2599, coarseLng: 77.4126 },
  { id: 'jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh', normalizedName: 'jabalpur', coarseLat: 23.1815, coarseLng: 79.9864 },
  { id: 'gwalior', city: 'Gwalior', state: 'Madhya Pradesh', normalizedName: 'gwalior', coarseLat: 26.2183, coarseLng: 78.1828 },
  { id: 'ujjain', city: 'Ujjain', state: 'Madhya Pradesh', normalizedName: 'ujjain', coarseLat: 23.1765, coarseLng: 75.7885 },
  { id: 'sagar', city: 'Sagar', state: 'Madhya Pradesh', normalizedName: 'sagar', coarseLat: 23.8388, coarseLng: 78.7378 },
  { id: 'dewas', city: 'Dewas', state: 'Madhya Pradesh', normalizedName: 'dewas', coarseLat: 22.9676, coarseLng: 76.0534 },
  { id: 'satna', city: 'Satna', state: 'Madhya Pradesh', normalizedName: 'satna', coarseLat: 24.6005, coarseLng: 80.8322 },
  { id: 'ratlam', city: 'Ratlam', state: 'Madhya Pradesh', normalizedName: 'ratlam', coarseLat: 23.3315, coarseLng: 75.0367 },

  // West Bengal
  { id: 'howrah', city: 'Howrah', state: 'West Bengal', normalizedName: 'howrah', coarseLat: 22.5958, coarseLng: 88.2636 },
  { id: 'asansol', city: 'Asansol', state: 'West Bengal', normalizedName: 'asansol', coarseLat: 23.6739, coarseLng: 86.9524 },
  { id: 'siliguri', city: 'Siliguri', state: 'West Bengal', normalizedName: 'siliguri', coarseLat: 26.7271, coarseLng: 88.3953 },
  { id: 'durgapur', city: 'Durgapur', state: 'West Bengal', normalizedName: 'durgapur', coarseLat: 23.5204, coarseLng: 87.3119 },
  { id: 'bardhaman', city: 'Bardhaman', state: 'West Bengal', normalizedName: 'bardhaman burdwan', coarseLat: 23.2324, coarseLng: 87.8615 },
  { id: 'malda', city: 'Malda', state: 'West Bengal', normalizedName: 'malda', coarseLat: 25.0108, coarseLng: 88.1411 },
  { id: 'kharagpur', city: 'Kharagpur', state: 'West Bengal', normalizedName: 'kharagpur', coarseLat: 22.3460, coarseLng: 87.2320 },
  { id: 'darjeeling', city: 'Darjeeling', state: 'West Bengal', normalizedName: 'darjeeling', coarseLat: 27.0410, coarseLng: 88.2663 },

  // Bihar & Jharkhand
  { id: 'patna', city: 'Patna', state: 'Bihar', normalizedName: 'patna', coarseLat: 25.5941, coarseLng: 85.1376 },
  { id: 'gaya', city: 'Gaya', state: 'Bihar', normalizedName: 'gaya bodhgaya', coarseLat: 24.7914, coarseLng: 85.0002 },
  { id: 'bhagalpur', city: 'Bhagalpur', state: 'Bihar', normalizedName: 'bhagalpur', coarseLat: 25.2425, coarseLng: 86.9842 },
  { id: 'muzaffarpur', city: 'Muzaffarpur', state: 'Bihar', normalizedName: 'muzaffarpur', coarseLat: 26.1209, coarseLng: 85.3647 },
  { id: 'darbhanga', city: 'Darbhanga', state: 'Bihar', normalizedName: 'darbhanga', coarseLat: 26.1542, coarseLng: 85.8918 },
  { id: 'purnia', city: 'Purnia', state: 'Bihar', normalizedName: 'purnia', coarseLat: 25.7771, coarseLng: 87.4753 },
  { id: 'ranchi', city: 'Ranchi', state: 'Jharkhand', normalizedName: 'ranchi', coarseLat: 23.3441, coarseLng: 85.3096 },
  { id: 'jamshedpur', city: 'Jamshedpur', state: 'Jharkhand', normalizedName: 'jamshedpur tata', coarseLat: 22.8046, coarseLng: 86.2029 },
  { id: 'dhanbad', city: 'Dhanbad', state: 'Jharkhand', normalizedName: 'dhanbad', coarseLat: 23.7957, coarseLng: 86.4304 },
  { id: 'bokaro', city: 'Bokaro Steel City', state: 'Jharkhand', normalizedName: 'bokaro steel city', coarseLat: 23.6693, coarseLng: 86.1511 },
  { id: 'deoghar', city: 'Deoghar', state: 'Jharkhand', normalizedName: 'deoghar', coarseLat: 24.4826, coarseLng: 86.7001 },

  // Punjab, Haryana & Chandigarh
  { id: 'chandigarh', city: 'Chandigarh', state: 'Punjab / Haryana', normalizedName: 'chandigarh mohali panchkula tri-city', coarseLat: 30.7333, coarseLng: 76.7794 },
  { id: 'ludhiana', city: 'Ludhiana', state: 'Punjab', normalizedName: 'ludhiana', coarseLat: 30.9010, coarseLng: 75.8573 },
  { id: 'amritsar', city: 'Amritsar', state: 'Punjab', normalizedName: 'amritsar', coarseLat: 31.6340, coarseLng: 74.8723 },
  { id: 'jalandhar', city: 'Jalandhar', state: 'Punjab', normalizedName: 'jalandhar', coarseLat: 31.3260, coarseLng: 75.5762 },
  { id: 'patiala', city: 'Patiala', state: 'Punjab', normalizedName: 'patiala', coarseLat: 30.3398, coarseLng: 76.3869 },
  { id: 'bathinda', city: 'Bathinda', state: 'Punjab', normalizedName: 'bathinda', coarseLat: 30.2110, coarseLng: 74.9455 },
  { id: 'faridabad', city: 'Faridabad', state: 'Haryana', normalizedName: 'faridabad', coarseLat: 28.4089, coarseLng: 77.3178 },
  { id: 'panipat', city: 'Panipat', state: 'Haryana', normalizedName: 'panipat', coarseLat: 29.3909, coarseLng: 76.9635 },
  { id: 'ambala', city: 'Ambala', state: 'Haryana', normalizedName: 'ambala', coarseLat: 30.3782, coarseLng: 76.7767 },
  { id: 'karnal', city: 'Karnal', state: 'Haryana', normalizedName: 'karnal', coarseLat: 29.6857, coarseLng: 76.9905 },
  { id: 'rohtak', city: 'Rohtak', state: 'Haryana', normalizedName: 'rohtak', coarseLat: 28.8955, coarseLng: 76.6066 },
  { id: 'hisar', city: 'Hisar', state: 'Haryana', normalizedName: 'hisar', coarseLat: 29.1492, coarseLng: 75.7217 },
  { id: 'sonipat', city: 'Sonipat', state: 'Haryana', normalizedName: 'sonipat', coarseLat: 28.9931, coarseLng: 77.0151 },

  // Odisha & Chhattisgarh
  { id: 'bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', normalizedName: 'bhubaneswar', coarseLat: 20.2961, coarseLng: 85.8245 },
  { id: 'cuttack', city: 'Cuttack', state: 'Odisha', normalizedName: 'cuttack', coarseLat: 20.4625, coarseLng: 85.8828 },
  { id: 'rourkela', city: 'Rourkela', state: 'Odisha', normalizedName: 'rourkela', coarseLat: 22.2604, coarseLng: 84.8536 },
  { id: 'berhampur', city: 'Berhampur', state: 'Odisha', normalizedName: 'berhampur brahmapur', coarseLat: 19.3149, coarseLng: 84.7941 },
  { id: 'sambalpur', city: 'Sambalpur', state: 'Odisha', normalizedName: 'sambalpur', coarseLat: 21.4669, coarseLng: 83.9812 },
  { id: 'puri', city: 'Puri', state: 'Odisha', normalizedName: 'puri', coarseLat: 19.8135, coarseLng: 85.8312 },
  { id: 'raipur', city: 'Raipur', state: 'Chhattisgarh', normalizedName: 'raipur', coarseLat: 21.2514, coarseLng: 81.6296 },
  { id: 'bhilai', city: 'Bhilai-Durg', state: 'Chhattisgarh', normalizedName: 'bhilai durg', coarseLat: 21.1938, coarseLng: 81.3509 },
  { id: 'bilaspur', city: 'Bilaspur', state: 'Chhattisgarh', normalizedName: 'bilaspur', coarseLat: 22.0797, coarseLng: 82.1409 },
  { id: 'korba', city: 'Korba', state: 'Chhattisgarh', normalizedName: 'korba', coarseLat: 22.3595, coarseLng: 82.7501 },

  // North East States
  { id: 'guwahati', city: 'Guwahati', state: 'Assam', normalizedName: 'guwahati', coarseLat: 26.1445, coarseLng: 91.7362 },
  { id: 'silchar', city: 'Silchar', state: 'Assam', normalizedName: 'silchar', coarseLat: 24.8333, coarseLng: 92.7789 },
  { id: 'dibrugarh', city: 'Dibrugarh', state: 'Assam', normalizedName: 'dibrugarh', coarseLat: 27.4728, coarseLng: 94.9120 },
  { id: 'jorhat', city: 'Jorhat', state: 'Assam', normalizedName: 'jorhat', coarseLat: 26.7509, coarseLng: 94.2037 },
  { id: 'tezpur', city: 'Tezpur', state: 'Assam', normalizedName: 'tezpur', coarseLat: 26.6528, coarseLng: 92.7926 },
  { id: 'shillong', city: 'Shillong', state: 'Meghalaya', normalizedName: 'shillong', coarseLat: 25.5788, coarseLng: 91.8933 },
  { id: 'imphal', city: 'Imphal', state: 'Manipur', normalizedName: 'imphal', coarseLat: 24.8170, coarseLng: 93.9368 },
  { id: 'aizawl', city: 'Aizawl', state: 'Mizoram', normalizedName: 'aizawl', coarseLat: 23.7307, coarseLng: 92.7173 },
  { id: 'kohima', city: 'Kohima', state: 'Nagaland', normalizedName: 'kohima', coarseLat: 25.6751, coarseLng: 94.1086 },
  { id: 'dimapur', city: 'Dimapur', state: 'Nagaland', normalizedName: 'dimapur', coarseLat: 25.9096, coarseLng: 93.7265 },
  { id: 'gangtok', city: 'Gangtok', state: 'Sikkim', normalizedName: 'gangtok', coarseLat: 27.3389, coarseLng: 88.6065 },
  { id: 'itanagar', city: 'Itanagar', state: 'Arunachal Pradesh', normalizedName: 'itanagar', coarseLat: 27.0844, coarseLng: 93.6053 },
  { id: 'agartala', city: 'Agartala', state: 'Tripura', normalizedName: 'agartala', coarseLat: 23.8315, coarseLng: 91.2868 },

  // Uttarakhand & Himachal Pradesh
  { id: 'dehradun', city: 'Dehradun', state: 'Uttarakhand', normalizedName: 'dehradun', coarseLat: 30.3165, coarseLng: 78.0322 },
  { id: 'haridwar', city: 'Haridwar', state: 'Uttarakhand', normalizedName: 'haridwar', coarseLat: 29.9457, coarseLng: 78.1642 },
  { id: 'rishikesh', city: 'Rishikesh', state: 'Uttarakhand', normalizedName: 'rishikesh', coarseLat: 30.0869, coarseLng: 78.2676 },
  { id: 'haldwani', city: 'Haldwani', state: 'Uttarakhand', normalizedName: 'haldwani', coarseLat: 29.2183, coarseLng: 79.5130 },
  { id: 'roorkee', city: 'Roorkee', state: 'Uttarakhand', normalizedName: 'roorkee', coarseLat: 29.8543, coarseLng: 77.8880 },
  { id: 'nainital', city: 'Nainital', state: 'Uttarakhand', normalizedName: 'nainital', coarseLat: 29.3919, coarseLng: 79.4542 },
  { id: 'shimla', city: 'Shimla', state: 'Himachal Pradesh', normalizedName: 'shimla', coarseLat: 31.1048, coarseLng: 77.1734 },
  { id: 'dharamshala', city: 'Dharamshala', state: 'Himachal Pradesh', normalizedName: 'dharamshala', coarseLat: 32.2190, coarseLng: 76.3234 },
  { id: 'manali', city: 'Manali', state: 'Himachal Pradesh', normalizedName: 'manali', coarseLat: 32.2432, coarseLng: 77.1892 },
  { id: 'kullu', city: 'Kullu', state: 'Himachal Pradesh', normalizedName: 'kullu', coarseLat: 31.9579, coarseLng: 77.1095 },
  { id: 'mandi', city: 'Mandi', state: 'Himachal Pradesh', normalizedName: 'mandi', coarseLat: 31.7087, coarseLng: 76.9320 },
  { id: 'solan', city: 'Solan', state: 'Himachal Pradesh', normalizedName: 'solan', coarseLat: 30.9045, coarseLng: 77.0967 },

  // Jammu & Kashmir and Ladakh
  { id: 'srinagar', city: 'Srinagar', state: 'Jammu & Kashmir', normalizedName: 'srinagar', coarseLat: 34.0837, coarseLng: 74.7973 },
  { id: 'jammu', city: 'Jammu', state: 'Jammu & Kashmir', normalizedName: 'jammu', coarseLat: 32.7266, coarseLng: 74.8570 },
  { id: 'leh', city: 'Leh', state: 'Ladakh', normalizedName: 'leh', coarseLat: 34.1526, coarseLng: 77.5771 },
  { id: 'kargil', city: 'Kargil', state: 'Ladakh', normalizedName: 'kargil', coarseLat: 34.5539, coarseLng: 76.1349 },

  {"id":"chikkamagaluru","city":"Chikkamagaluru","state":"Karnataka","normalizedName":"chikkamagaluru chikmagalur","coarseLat":13.3161,"coarseLng":75.772},
  {"id":"madikeri","city":"Madikeri","state":"Karnataka","normalizedName":"madikeri coorg","coarseLat":12.4244,"coarseLng":75.7382},
  {"id":"karwar","city":"Karwar","state":"Karnataka","normalizedName":"karwar","coarseLat":14.8138,"coarseLng":74.1298},
  {"id":"sirsi","city":"Sirsi","state":"Karnataka","normalizedName":"sirsi","coarseLat":14.6196,"coarseLng":74.8354},
  {"id":"gokarna","city":"Gokarna","state":"Karnataka","normalizedName":"gokarna","coarseLat":14.5479,"coarseLng":74.3188},
  {"id":"bagalkot","city":"Bagalkot","state":"Karnataka","normalizedName":"bagalkot","coarseLat":16.1691,"coarseLng":75.6615},
  {"id":"gadag","city":"Gadag","state":"Karnataka","normalizedName":"gadag","coarseLat":15.4298,"coarseLng":75.6322},
  {"id":"koppal","city":"Koppal","state":"Karnataka","normalizedName":"koppal","coarseLat":15.3456,"coarseLng":76.1558},
  {"id":"yadgir","city":"Yadgir","state":"Karnataka","normalizedName":"yadgir","coarseLat":16.7624,"coarseLng":77.1442},
  {"id":"chamarajanagar","city":"Chamarajanagar","state":"Karnataka","normalizedName":"chamarajanagar","coarseLat":11.9261,"coarseLng":76.9437},
  {"id":"ramanagara","city":"Ramanagara","state":"Karnataka","normalizedName":"ramanagara","coarseLat":12.715,"coarseLng":77.281},
  {"id":"chikkaballapur","city":"Chikkaballapur","state":"Karnataka","normalizedName":"chikkaballapur","coarseLat":13.4355,"coarseLng":77.7315},
  {"id":"kolar","city":"Kolar","state":"Karnataka","normalizedName":"kolar","coarseLat":13.1367,"coarseLng":78.1291},
  {"id":"mandya","city":"Mandya","state":"Karnataka","normalizedName":"mandya","coarseLat":12.5218,"coarseLng":76.8951},
  {"id":"bhatkal","city":"Bhatkal","state":"Karnataka","normalizedName":"bhatkal","coarseLat":13.9774,"coarseLng":74.5647},
  {"id":"kundapura","city":"Kundapura","state":"Karnataka","normalizedName":"kundapura kundapur","coarseLat":13.6267,"coarseLng":74.6917},
  {"id":"puttur","city":"Puttur","state":"Karnataka","normalizedName":"puttur","coarseLat":12.7661,"coarseLng":75.2038},
  {"id":"haveri","city":"Haveri","state":"Karnataka","normalizedName":"haveri","coarseLat":14.7954,"coarseLng":75.3991},
  {"id":"baramati","city":"Baramati","state":"Maharashtra","normalizedName":"baramati","coarseLat":18.1517,"coarseLng":74.5772},
  {"id":"satara","city":"Satara","state":"Maharashtra","normalizedName":"satara","coarseLat":17.6805,"coarseLng":73.9997},
  {"id":"sangli","city":"Sangli","state":"Maharashtra","normalizedName":"sangli miraj","coarseLat":16.8524,"coarseLng":74.5815},
  {"id":"ratnagiri","city":"Ratnagiri","state":"Maharashtra","normalizedName":"ratnagiri","coarseLat":16.9902,"coarseLng":73.312},
  {"id":"alibag","city":"Alibag","state":"Maharashtra","normalizedName":"alibag","coarseLat":18.6584,"coarseLng":72.8773},
  {"id":"panvel","city":"Panvel","state":"Maharashtra","normalizedName":"panvel","coarseLat":18.9894,"coarseLng":73.1175},
  {"id":"kalyan","city":"Kalyan-Dombivli","state":"Maharashtra","normalizedName":"kalyan dombivli","coarseLat":19.2403,"coarseLng":73.1305},
  {"id":"vasai_virar","city":"Vasai-Virar","state":"Maharashtra","normalizedName":"vasai virar","coarseLat":19.3919,"coarseLng":72.8397},
  {"id":"malegaon","city":"Malegaon","state":"Maharashtra","normalizedName":"malegaon","coarseLat":20.5579,"coarseLng":74.5287},
  {"id":"ichalkaranji","city":"Ichalkaranji","state":"Maharashtra","normalizedName":"ichalkaranji","coarseLat":16.6922,"coarseLng":74.4578},
  {"id":"jalna","city":"Jalna","state":"Maharashtra","normalizedName":"jalna","coarseLat":19.841,"coarseLng":75.8864},
  {"id":"beed","city":"Beed","state":"Maharashtra","normalizedName":"beed","coarseLat":18.9891,"coarseLng":75.7601},
  {"id":"dharashiv","city":"Dharashiv","state":"Maharashtra","normalizedName":"dharashiv osmanabad","coarseLat":18.1861,"coarseLng":76.0419},
  {"id":"parbhani","city":"Parbhani","state":"Maharashtra","normalizedName":"parbhani","coarseLat":19.2686,"coarseLng":76.7708},
  {"id":"gondia","city":"Gondia","state":"Maharashtra","normalizedName":"gondia","coarseLat":21.4598,"coarseLng":80.1961},
  {"id":"wardha","city":"Wardha","state":"Maharashtra","normalizedName":"wardha sevagram","coarseLat":20.7453,"coarseLng":78.6022},
  {"id":"yavatmal","city":"Yavatmal","state":"Maharashtra","normalizedName":"yavatmal","coarseLat":20.3888,"coarseLng":78.1204},
  {"id":"kozhikode","city":"Kozhikode","state":"Kerala","normalizedName":"kozhikode calicut","coarseLat":11.2588,"coarseLng":75.7804},
  {"id":"thrissur","city":"Thrissur","state":"Kerala","normalizedName":"thrissur trichur","coarseLat":10.5276,"coarseLng":76.2144},
  {"id":"kollam","city":"Kollam","state":"Kerala","normalizedName":"kollam quilon","coarseLat":8.8932,"coarseLng":76.6141},
  {"id":"alappuzha","city":"Alappuzha","state":"Kerala","normalizedName":"alappuzha alleppey","coarseLat":9.4981,"coarseLng":76.3388},
  {"id":"palakkad","city":"Palakkad","state":"Kerala","normalizedName":"palakkad palghat","coarseLat":10.7867,"coarseLng":76.6548},
  {"id":"malappuram","city":"Malappuram","state":"Kerala","normalizedName":"malappuram","coarseLat":11.051,"coarseLng":76.0711},
  {"id":"kannur","city":"Kannur","state":"Kerala","normalizedName":"kannur cannanore","coarseLat":11.8745,"coarseLng":75.3704},
  {"id":"kasaragod","city":"Kasaragod","state":"Kerala","normalizedName":"kasaragod","coarseLat":12.4996,"coarseLng":74.9869},
  {"id":"kottayam","city":"Kottayam","state":"Kerala","normalizedName":"kottayam","coarseLat":9.5916,"coarseLng":76.5222},
  {"id":"thiruvananthapuram","city":"Thiruvananthapuram","state":"Kerala","normalizedName":"thiruvananthapuram trivandrum","coarseLat":8.5241,"coarseLng":76.9366},
  {"id":"wayanad","city":"Wayanad","state":"Kerala","normalizedName":"wayanad kalpetta","coarseLat":11.605,"coarseLng":76.0828},
  {"id":"thalassery","city":"Thalassery","state":"Kerala","normalizedName":"thalassery tellicherry","coarseLat":11.7491,"coarseLng":75.489},
  {"id":"tiruppur","city":"Tiruppur","state":"Tamil Nadu","normalizedName":"tiruppur tirupur","coarseLat":11.1085,"coarseLng":77.3411},
  {"id":"erode","city":"Erode","state":"Tamil Nadu","normalizedName":"erode","coarseLat":11.341,"coarseLng":77.7172},
  {"id":"vellore","city":"Vellore","state":"Tamil Nadu","normalizedName":"vellore","coarseLat":12.9165,"coarseLng":79.1325},
  {"id":"thoothukudi","city":"Thoothukudi","state":"Tamil Nadu","normalizedName":"thoothukudi tuticorin","coarseLat":8.7642,"coarseLng":78.1348},
  {"id":"dindigul","city":"Dindigul","state":"Tamil Nadu","normalizedName":"dindigul","coarseLat":10.3673,"coarseLng":77.9803},
  {"id":"thanjavur","city":"Thanjavur","state":"Tamil Nadu","normalizedName":"thanjavur tanjore","coarseLat":10.787,"coarseLng":79.1378},
  {"id":"ranipet","city":"Ranipet","state":"Tamil Nadu","normalizedName":"ranipet","coarseLat":12.9272,"coarseLng":79.333},
  {"id":"sivakasi","city":"Sivakasi","state":"Tamil Nadu","normalizedName":"sivakasi","coarseLat":9.4533,"coarseLng":77.8024},
  {"id":"karur","city":"Karur","state":"Tamil Nadu","normalizedName":"karur","coarseLat":10.9601,"coarseLng":78.0766},
  {"id":"ooty","city":"Udhagamandalam","state":"Tamil Nadu","normalizedName":"udhagamandalam ooty nilgiris","coarseLat":11.4102,"coarseLng":76.695},
  {"id":"hosur","city":"Hosur","state":"Tamil Nadu","normalizedName":"hosur","coarseLat":12.7409,"coarseLng":77.8253},
  {"id":"nagercoil","city":"Nagercoil","state":"Tamil Nadu","normalizedName":"nagercoil kanyakumari","coarseLat":8.1833,"coarseLng":77.4119},
  {"id":"kanchipuram","city":"Kanchipuram","state":"Tamil Nadu","normalizedName":"kanchipuram","coarseLat":12.8342,"coarseLng":79.7036},
  {"id":"kumbakonam","city":"Kumbakonam","state":"Tamil Nadu","normalizedName":"kumbakonam","coarseLat":10.9602,"coarseLng":79.3845},
  {"id":"cuddalore","city":"Cuddalore","state":"Tamil Nadu","normalizedName":"cuddalore","coarseLat":11.748,"coarseLng":79.7714},
  {"id":"tiruvannamalai","city":"Tiruvannamalai","state":"Tamil Nadu","normalizedName":"tiruvannamalai","coarseLat":12.2253,"coarseLng":79.0747},
  {"id":"visakhapatnam","city":"Visakhapatnam","state":"Andhra Pradesh","normalizedName":"visakhapatnam vizag","coarseLat":17.6868,"coarseLng":83.2185},
  {"id":"vijayawada","city":"Vijayawada","state":"Andhra Pradesh","normalizedName":"vijayawada bezawada","coarseLat":16.5062,"coarseLng":80.648},
  {"id":"guntur","city":"Guntur","state":"Andhra Pradesh","normalizedName":"guntur","coarseLat":16.3067,"coarseLng":80.4365},
  {"id":"nellore","city":"Nellore","state":"Andhra Pradesh","normalizedName":"nellore","coarseLat":14.4426,"coarseLng":79.9865},
  {"id":"kurnool","city":"Kurnool","state":"Andhra Pradesh","normalizedName":"kurnool","coarseLat":15.8281,"coarseLng":78.0373},
  {"id":"kakinada","city":"Kakinada","state":"Andhra Pradesh","normalizedName":"kakinada","coarseLat":16.9891,"coarseLng":82.2475},
  {"id":"rajamahendravaram","city":"Rajamahendravaram","state":"Andhra Pradesh","normalizedName":"rajamahendravaram rajahmundry","coarseLat":17.0005,"coarseLng":81.804},
  {"id":"tirupati","city":"Tirupati","state":"Andhra Pradesh","normalizedName":"tirupati","coarseLat":13.6288,"coarseLng":79.4192},
  {"id":"kadapa","city":"Kadapa","state":"Andhra Pradesh","normalizedName":"kadapa cuddapah","coarseLat":14.4673,"coarseLng":78.8242},
  {"id":"anantapur","city":"Anantapur","state":"Andhra Pradesh","normalizedName":"anantapur ananthapuramu","coarseLat":14.6819,"coarseLng":77.6006},
  {"id":"warangal","city":"Warangal","state":"Telangana","normalizedName":"warangal kazipet hanamkonda","coarseLat":17.9689,"coarseLng":79.5941},
  {"id":"nizamabad","city":"Nizamabad","state":"Telangana","normalizedName":"nizamabad","coarseLat":18.6725,"coarseLng":78.0941},
  {"id":"khammam","city":"Khammam","state":"Telangana","normalizedName":"khammam","coarseLat":17.2473,"coarseLng":80.1514},
  {"id":"karimnagar","city":"Karimnagar","state":"Telangana","normalizedName":"karimnagar","coarseLat":18.4386,"coarseLng":79.1288},
  {"id":"ramagundam","city":"Ramagundam","state":"Telangana","normalizedName":"ramagundam","coarseLat":18.7551,"coarseLng":79.5144},
  {"id":"mahbubnagar","city":"Mahbubnagar","state":"Telangana","normalizedName":"mahbubnagar palamoor","coarseLat":16.7488,"coarseLng":78.0035},
  {"id":"surat","city":"Surat","state":"Gujarat","normalizedName":"surat","coarseLat":21.1702,"coarseLng":72.8311},
  {"id":"vadodara","city":"Vadodara","state":"Gujarat","normalizedName":"vadodara baroda","coarseLat":22.3072,"coarseLng":73.1812},
  {"id":"rajkot","city":"Rajkot","state":"Gujarat","normalizedName":"rajkot","coarseLat":22.3039,"coarseLng":70.8022},
  {"id":"bhavnagar","city":"Bhavnagar","state":"Gujarat","normalizedName":"bhavnagar","coarseLat":21.7645,"coarseLng":72.1519},
  {"id":"jamnagar","city":"Jamnagar","state":"Gujarat","normalizedName":"jamnagar","coarseLat":22.4707,"coarseLng":70.0577},
  {"id":"junagadh","city":"Junagadh","state":"Gujarat","normalizedName":"junagadh","coarseLat":21.5222,"coarseLng":70.4579},
  {"id":"gandhinagar","city":"Gandhinagar","state":"Gujarat","normalizedName":"gandhinagar","coarseLat":23.2156,"coarseLng":72.6369},
  {"id":"anand","city":"Anand","state":"Gujarat","normalizedName":"anand","coarseLat":22.5645,"coarseLng":72.9289},
  {"id":"navsari","city":"Navsari","state":"Gujarat","normalizedName":"navsari","coarseLat":20.95,"coarseLng":72.93},
  {"id":"morbi","city":"Morbi","state":"Gujarat","normalizedName":"morbi","coarseLat":22.812,"coarseLng":70.8378},
  {"id":"nadiad","city":"Nadiad","state":"Gujarat","normalizedName":"nadiad","coarseLat":22.6916,"coarseLng":72.8634},
  {"id":"bharuch","city":"Bharuch","state":"Gujarat","normalizedName":"bharuch broach","coarseLat":21.7051,"coarseLng":72.9959},
  {"id":"bhuj","city":"Bhuj","state":"Gujarat","normalizedName":"bhuj kutch","coarseLat":23.242,"coarseLng":69.6669},
  {"id":"porbandar","city":"Porbandar","state":"Gujarat","normalizedName":"porbandar","coarseLat":21.6417,"coarseLng":69.6293},
  {"id":"vapi","city":"Vapi","state":"Gujarat","normalizedName":"vapi","coarseLat":20.3893,"coarseLng":72.9106},
  {"id":"jodhpur","city":"Jodhpur","state":"Rajasthan","normalizedName":"jodhpur","coarseLat":26.2389,"coarseLng":73.0243},
  {"id":"kota","city":"Kota","state":"Rajasthan","normalizedName":"kota","coarseLat":25.2138,"coarseLng":75.8648},
  {"id":"bikaner","city":"Bikaner","state":"Rajasthan","normalizedName":"bikaner","coarseLat":28.0229,"coarseLng":73.3119},
  {"id":"ajmer","city":"Ajmer","state":"Rajasthan","normalizedName":"ajmer pushkar","coarseLat":26.4499,"coarseLng":74.6399},
  {"id":"udaipur","city":"Udaipur","state":"Rajasthan","normalizedName":"udaipur mewar","coarseLat":24.5854,"coarseLng":73.7125},
  {"id":"bhilwara","city":"Bhilwara","state":"Rajasthan","normalizedName":"bhilwara","coarseLat":25.3407,"coarseLng":74.6313},
  {"id":"alwar","city":"Alwar","state":"Rajasthan","normalizedName":"alwar","coarseLat":27.553,"coarseLng":76.6346},
  {"id":"bharatpur","city":"Bharatpur","state":"Rajasthan","normalizedName":"bharatpur","coarseLat":27.2152,"coarseLng":77.503},
  {"id":"sikar","city":"Sikar","state":"Rajasthan","normalizedName":"sikar","coarseLat":27.6094,"coarseLng":75.1398},
  {"id":"pali","city":"Pali","state":"Rajasthan","normalizedName":"pali","coarseLat":25.7711,"coarseLng":73.3234},
  {"id":"sri_ganganagar","city":"Sri Ganganagar","state":"Rajasthan","normalizedName":"sri ganganagar","coarseLat":29.9038,"coarseLng":73.8772},
  {"id":"jaisalmer","city":"Jaisalmer","state":"Rajasthan","normalizedName":"jaisalmer","coarseLat":26.9157,"coarseLng":70.9083},
  {"id":"mount_abu","city":"Mount Abu","state":"Rajasthan","normalizedName":"mount abu","coarseLat":24.5926,"coarseLng":72.7156},
  {"id":"chittorgarh","city":"Chittorgarh","state":"Rajasthan","normalizedName":"chittorgarh","coarseLat":24.8887,"coarseLng":74.6269},
  {"id":"kanpur","city":"Kanpur","state":"Uttar Pradesh","normalizedName":"kanpur cawnpore","coarseLat":26.4499,"coarseLng":80.3319},
  {"id":"ghaziabad","city":"Ghaziabad","state":"Uttar Pradesh","normalizedName":"ghaziabad","coarseLat":28.6692,"coarseLng":77.4538},
  {"id":"agra","city":"Agra","state":"Uttar Pradesh","normalizedName":"agra taj","coarseLat":27.1767,"coarseLng":78.0081},
  {"id":"varanasi","city":"Varanasi","state":"Uttar Pradesh","normalizedName":"varanasi benaras kashi","coarseLat":25.3176,"coarseLng":82.9739},
  {"id":"meerut","city":"Meerut","state":"Uttar Pradesh","normalizedName":"meerut","coarseLat":28.9845,"coarseLng":77.7064},
  {"id":"prayagraj","city":"Prayagraj","state":"Uttar Pradesh","normalizedName":"prayagraj allahabad","coarseLat":25.4358,"coarseLng":81.8463},
  {"id":"bareilly","city":"Bareilly","state":"Uttar Pradesh","normalizedName":"bareilly","coarseLat":28.367,"coarseLng":79.4304},
  {"id":"aligarh","city":"Aligarh","state":"Uttar Pradesh","normalizedName":"aligarh","coarseLat":27.8974,"coarseLng":78.088},
  {"id":"moradabad","city":"Moradabad","state":"Uttar Pradesh","normalizedName":"moradabad","coarseLat":28.8351,"coarseLng":78.7747},
  {"id":"saharanpur","city":"Saharanpur","state":"Uttar Pradesh","normalizedName":"saharanpur","coarseLat":29.964,"coarseLng":77.546},
  {"id":"gorakhpur","city":"Gorakhpur","state":"Uttar Pradesh","normalizedName":"gorakhpur","coarseLat":26.7606,"coarseLng":83.3732},
  {"id":"jhansi","city":"Jhansi","state":"Uttar Pradesh","normalizedName":"jhansi","coarseLat":25.4484,"coarseLng":78.5685},
  {"id":"mathura","city":"Mathura","state":"Uttar Pradesh","normalizedName":"mathura vrindavan","coarseLat":27.4924,"coarseLng":77.6737},
  {"id":"ayodhya","city":"Ayodhya","state":"Uttar Pradesh","normalizedName":"ayodhya faizabad","coarseLat":26.7922,"coarseLng":82.1998},
  {"id":"patna","city":"Patna","state":"Bihar","normalizedName":"patna patliputra","coarseLat":25.5941,"coarseLng":85.1376},
  {"id":"gaya","city":"Gaya","state":"Bihar","normalizedName":"gaya bodh gaya","coarseLat":24.7955,"coarseLng":85.0002},
  {"id":"bhagalpur","city":"Bhagalpur","state":"Bihar","normalizedName":"bhagalpur","coarseLat":25.2425,"coarseLng":86.9842},
  {"id":"muzaffarpur","city":"Muzaffarpur","state":"Bihar","normalizedName":"muzaffarpur","coarseLat":26.1209,"coarseLng":85.3647},
  {"id":"darbhanga","city":"Darbhanga","state":"Bihar","normalizedName":"darbhanga","coarseLat":26.1542,"coarseLng":85.8918},
  {"id":"howrah","city":"Howrah","state":"West Bengal","normalizedName":"howrah","coarseLat":22.5958,"coarseLng":88.2636},
  {"id":"asansol","city":"Asansol","state":"West Bengal","normalizedName":"asansol","coarseLat":23.6739,"coarseLng":86.9524},
  {"id":"siliguri","city":"Siliguri","state":"West Bengal","normalizedName":"siliguri","coarseLat":26.7271,"coarseLng":88.3953},
  {"id":"durgapur","city":"Durgapur","state":"West Bengal","normalizedName":"durgapur","coarseLat":23.5204,"coarseLng":87.3119},
  {"id":"darjeeling","city":"Darjeeling","state":"West Bengal","normalizedName":"darjeeling","coarseLat":27.041,"coarseLng":88.2663},
  {"id":"bhubaneswar","city":"Bhubaneswar","state":"Odisha","normalizedName":"bhubaneswar","coarseLat":20.2961,"coarseLng":85.8245},
  {"id":"cuttack","city":"Cuttack","state":"Odisha","normalizedName":"cuttack","coarseLat":20.4625,"coarseLng":85.8828},
  {"id":"rourkela","city":"Rourkela","state":"Odisha","normalizedName":"rourkela","coarseLat":22.2604,"coarseLng":84.8536},
  {"id":"puri","city":"Puri","state":"Odisha","normalizedName":"puri jagannath","coarseLat":19.8135,"coarseLng":85.8312},
  {"id":"indore","city":"Indore","state":"Madhya Pradesh","normalizedName":"indore","coarseLat":22.7196,"coarseLng":75.8577},
  {"id":"bhopal","city":"Bhopal","state":"Madhya Pradesh","normalizedName":"bhopal","coarseLat":23.2599,"coarseLng":77.4126},
  {"id":"jabalpur","city":"Jabalpur","state":"Madhya Pradesh","normalizedName":"jabalpur","coarseLat":23.1815,"coarseLng":79.9864},
  {"id":"gwalior","city":"Gwalior","state":"Madhya Pradesh","normalizedName":"gwalior","coarseLat":26.2183,"coarseLng":78.1828},
  {"id":"ujjain","city":"Ujjain","state":"Madhya Pradesh","normalizedName":"ujjain mahakal","coarseLat":23.1765,"coarseLng":75.7885},
  {"id":"raipur","city":"Raipur","state":"Chhattisgarh","normalizedName":"raipur","coarseLat":21.2514,"coarseLng":81.6296},
  {"id":"bhilai","city":"Bhilai","state":"Chhattisgarh","normalizedName":"bhilai durg","coarseLat":21.1938,"coarseLng":81.3509},
  {"id":"ranchi","city":"Ranchi","state":"Jharkhand","normalizedName":"ranchi","coarseLat":23.3441,"coarseLng":85.3096},
  {"id":"jamshedpur","city":"Jamshedpur","state":"Jharkhand","normalizedName":"jamshedpur tata","coarseLat":22.8046,"coarseLng":86.2029},
  {"id":"dhanbad","city":"Dhanbad","state":"Jharkhand","normalizedName":"dhanbad","coarseLat":23.7957,"coarseLng":86.4304},
  {"id":"ludhiana","city":"Ludhiana","state":"Punjab","normalizedName":"ludhiana","coarseLat":30.901,"coarseLng":75.8573},
  {"id":"amritsar","city":"Amritsar","state":"Punjab","normalizedName":"amritsar golden temple","coarseLat":31.634,"coarseLng":74.8723},
  {"id":"jalandhar","city":"Jalandhar","state":"Punjab","normalizedName":"jalandhar","coarseLat":31.326,"coarseLng":75.5762},
  {"id":"chandigarh","city":"Chandigarh","state":"Chandigarh","normalizedName":"chandigarh mohali panchkula","coarseLat":30.7333,"coarseLng":76.7794},
  {"id":"faridabad","city":"Faridabad","state":"Haryana","normalizedName":"faridabad","coarseLat":28.4089,"coarseLng":77.3178},
  {"id":"dehradun","city":"Dehradun","state":"Uttarakhand","normalizedName":"dehradun doon mussoorie","coarseLat":30.3165,"coarseLng":78.0322},
  {"id":"haridwar","city":"Haridwar","state":"Uttarakhand","normalizedName":"haridwar rishikesh","coarseLat":29.9457,"coarseLng":78.1642},
  {"id":"shimla","city":"Shimla","state":"Himachal Pradesh","normalizedName":"shimla","coarseLat":31.1048,"coarseLng":77.1734},
  {"id":"dharamshala","city":"Dharamshala","state":"Himachal Pradesh","normalizedName":"dharamshala mcleodganj","coarseLat":32.219,"coarseLng":76.3234},
  {"id":"manali","city":"Manali","state":"Himachal Pradesh","normalizedName":"manali kullu","coarseLat":32.2432,"coarseLng":77.1892},
  {"id":"srinagar","city":"Srinagar","state":"Jammu and Kashmir","normalizedName":"srinagar kashmir","coarseLat":34.0837,"coarseLng":74.7973},
  {"id":"jammu","city":"Jammu","state":"Jammu and Kashmir","normalizedName":"jammu tawi","coarseLat":32.7266,"coarseLng":74.857},
  {"id":"panaji","city":"Panaji","state":"Goa","normalizedName":"panaji goa panjim","coarseLat":15.4909,"coarseLng":73.8278},
  {"id":"margao","city":"Margao","state":"Goa","normalizedName":"margao madgaon goa","coarseLat":15.2832,"coarseLng":73.9862},
  {"id":"guwahati","city":"Guwahati","state":"Assam","normalizedName":"guwahati gauhati","coarseLat":26.1445,"coarseLng":91.7362},
  {"id":"silchar","city":"Silchar","state":"Assam","normalizedName":"silchar","coarseLat":24.8333,"coarseLng":92.7789},
  {"id":"dibrugarh","city":"Dibrugarh","state":"Assam","normalizedName":"dibrugarh","coarseLat":27.4728,"coarseLng":94.912},
  {"id":"agartala","city":"Agartala","state":"Tripura","normalizedName":"agartala","coarseLat":23.8315,"coarseLng":91.2868},
  {"id":"shillong","city":"Shillong","state":"Meghalaya","normalizedName":"shillong","coarseLat":25.5788,"coarseLng":91.8933},
  {"id":"imphal","city":"Imphal","state":"Manipur","normalizedName":"imphal","coarseLat":24.817,"coarseLng":93.9368},
  {"id":"aizawl","city":"Aizawl","state":"Mizoram","normalizedName":"aizawl","coarseLat":23.7271,"coarseLng":92.7176},
  {"id":"kohima","city":"Kohima","state":"Nagaland","normalizedName":"kohima","coarseLat":25.6751,"coarseLng":94.1086},
  {"id":"dimapur","city":"Dimapur","state":"Nagaland","normalizedName":"dimapur","coarseLat":25.909,"coarseLng":93.7266},
  {"id":"gangtok","city":"Gangtok","state":"Sikkim","normalizedName":"gangtok","coarseLat":27.3389,"coarseLng":88.6065},
  {"id":"itanagar","city":"Itanagar","state":"Arunachal Pradesh","normalizedName":"itanagar","coarseLat":27.0844,"coarseLng":93.6053},
  {"id":"port_blair","city":"Port Blair","state":"Andaman and Nicobar Islands","normalizedName":"port blair andaman","coarseLat":11.6234,"coarseLng":92.7265},
  {"id":"puducherry","city":"Puducherry","state":"Puducherry","normalizedName":"puducherry pondicherry","coarseLat":11.9416,"coarseLng":79.8083},
  {"id":"silvassa","city":"Silvassa","state":"Dadra and Nagar Haveli","normalizedName":"silvassa dadra","coarseLat":20.2763,"coarseLng":73.0083},
  {"id":"daman","city":"Daman","state":"Daman and Diu","normalizedName":"daman diu","coarseLat":20.3974,"coarseLng":72.8328},
  {"id":"leh","city":"Leh","state":"Ladakh","normalizedName":"leh ladakh","coarseLat":34.1526,"coarseLng":77.5771},
  {"id":"kargil","city":"Kargil","state":"Ladakh","normalizedName":"kargil","coarseLat":34.5539,"coarseLng":76.1349},

  // Goa & Union Territories
  { id: 'panaji', city: 'Panaji', state: 'Goa', normalizedName: 'panaji panjim', coarseLat: 15.4909, coarseLng: 73.8278 },
  { id: 'margao', city: 'Margao', state: 'Goa', normalizedName: 'margao madgaon', coarseLat: 15.2832, coarseLng: 73.9862 },
  { id: 'vasco_da_gama', city: 'Vasco da Gama', state: 'Goa', normalizedName: 'vasco da gama', coarseLat: 15.3982, coarseLng: 73.8113 },
  { id: 'puducherry', city: 'Puducherry', state: 'Puducherry', normalizedName: 'puducherry pondicherry', coarseLat: 11.9416, coarseLng: 79.8083 },
  { id: 'port_blair', city: 'Port Blair', state: 'Andaman & Nicobar', normalizedName: 'port blair', coarseLat: 11.6234, coarseLng: 92.7265 },
  { id: 'silvassa', city: 'Silvassa', state: 'Dadra & Nagar Haveli', normalizedName: 'silvassa', coarseLat: 20.2763, coarseLng: 73.0083 },
  { id: 'daman', city: 'Daman', state: 'Daman & Diu', normalizedName: 'daman', coarseLat: 20.3974, coarseLng: 72.8328 },
]);

const POPULAR_CITY_IDS = [
  'bengaluru',
  'mumbai',
  'delhi',
  'hyderabad',
  'chennai',
  'pune',
  'kolkata',
  'ahmedabad',
  'jaipur',
  'kochi',
  'chandigarh',
  'lucknow',
  'indore',
];

export const getPopularCities = () => {
  return INDIA_CITIES.filter((c) => POPULAR_CITY_IDS.includes(c.id)).map((c) => ({
    ...c,
    name: c.city,
    lat: c.coarseLat,
    lng: c.coarseLng,
  }));
};

export const POPULAR_CITIES = getPopularCities();

/**
 * Fast local search through static India city dataset.
 * Windowed to maximum `limit` items to prevent giant UI DOM trees.
 * @param {string} query 
 * @param {number} limit 
 * @returns {Array}
 */
export const searchIndiaCities = (query, limit = 20) => {
  const q = String(query || '').trim().toLowerCase();
  const list = !q
    ? INDIA_CITIES
    : INDIA_CITIES.filter((c) =>
        c.normalizedName.includes(q) || c.state.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
      );
  return list.slice(0, limit).map((c) => ({
    ...c,
    name: c.city,
    lat: c.coarseLat,
    lng: c.coarseLng,
  }));
};

export const searchCities = searchIndiaCities;

/**
 * Resolves a city by internal ID.
 * @param {string} id 
 * @returns {object|null}
 */
export const getCityById = (id) => {
  if (!id) return null;
  const found = INDIA_CITIES.find((c) => c.id === id);
  if (!found) return null;
  return {
    ...found,
    name: found.city,
    lat: found.coarseLat,
    lng: found.coarseLng,
  };
};

/**
 * Sanitizes a custom user-entered city string.
 * Max ~40-48 characters, strip HTML tags/script/control characters.
 * @param {string} customInput 
 * @returns {string}
 */
export const sanitizeCustomCity = (customInput) => {
  if (!customInput) return '';
  return String(customInput)
    .replace(/[<>'"/\\&;]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
};

/**
 * Calculates coarse great-circle distance between two coordinates in km.
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Formats a city object or name for display
 */
export const formatCityLabel = (city) => {
  if (!city) return '';
  const name = city.name || city.city || '';
  const state = city.state || '';
  return state ? `${name}, ${state}` : name;
};

