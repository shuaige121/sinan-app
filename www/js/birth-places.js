/* 出生地城市经度：供真太阳时自动填充。数值取城市中心附近，精确到约 0.1°。 */
(function (global) {
  'use strict';

  global.SinanBirthPlaces = Object.freeze([
    { code: 'CN', zh: '中国大陆', en: 'Mainland China', cities: [
      ['beijing', '北京', 'Beijing', 116.4], ['shanghai', '上海', 'Shanghai', 121.5],
      ['guangzhou', '广州', 'Guangzhou', 113.3], ['shenzhen', '深圳', 'Shenzhen', 114.1],
      ['chengdu', '成都', 'Chengdu', 104.1], ['chongqing', '重庆', 'Chongqing', 106.6],
      ['hangzhou', '杭州', 'Hangzhou', 120.2], ['nanjing', '南京', 'Nanjing', 118.8],
      ['wuhan', '武汉', 'Wuhan', 114.3], ['xian', '西安', "Xi'an", 108.9],
      ['tianjin', '天津', 'Tianjin', 117.2], ['shenyang', '沈阳', 'Shenyang', 123.4],
      ['harbin', '哈尔滨', 'Harbin', 126.6], ['qingdao', '青岛', 'Qingdao', 120.4],
      ['xiamen', '厦门', 'Xiamen', 118.1], ['fuzhou', '福州', 'Fuzhou', 119.3],
      ['kunming', '昆明', 'Kunming', 102.7], ['changsha', '长沙', 'Changsha', 112.9],
      ['zhengzhou', '郑州', 'Zhengzhou', 113.6], ['urumqi', '乌鲁木齐', 'Urumqi', 87.6],
      ['lhasa', '拉萨', 'Lhasa', 91.1]
    ] },
    { code: 'HK', zh: '中国香港', en: 'Hong Kong, China', cities: [['hong-kong', '香港', 'Hong Kong', 114.2]] },
    { code: 'MO', zh: '中国澳门', en: 'Macao, China', cities: [['macao', '澳门', 'Macao', 113.5]] },
    { code: 'TW', zh: '中国台湾', en: 'Taiwan, China', cities: [
      ['taipei', '台北', 'Taipei', 121.6], ['taichung', '台中', 'Taichung', 120.7],
      ['tainan', '台南', 'Tainan', 120.2], ['kaohsiung', '高雄', 'Kaohsiung', 120.3]
    ] },
    { code: 'SG', zh: '新加坡', en: 'Singapore', cities: [['singapore', '新加坡', 'Singapore', 103.8]] },
    { code: 'MY', zh: '马来西亚', en: 'Malaysia', cities: [
      ['kuala-lumpur', '吉隆坡', 'Kuala Lumpur', 101.7], ['johor-bahru', '新山', 'Johor Bahru', 103.8],
      ['george-town', '槟城', 'George Town', 100.3], ['malacca', '马六甲', 'Malacca', 102.3],
      ['kota-kinabalu', '亚庇', 'Kota Kinabalu', 116.1], ['kuching', '古晋', 'Kuching', 110.3]
    ] },
    { code: 'JP', zh: '日本', en: 'Japan', cities: [
      ['tokyo', '东京', 'Tokyo', 139.7], ['osaka', '大阪', 'Osaka', 135.5], ['kyoto', '京都', 'Kyoto', 135.8],
      ['sapporo', '札幌', 'Sapporo', 141.4], ['fukuoka', '福冈', 'Fukuoka', 130.4]
    ] },
    { code: 'KR', zh: '韩国', en: 'South Korea', cities: [['seoul', '首尔', 'Seoul', 127.0], ['busan', '釜山', 'Busan', 129.1]] },
    { code: 'TH', zh: '泰国', en: 'Thailand', cities: [['bangkok', '曼谷', 'Bangkok', 100.5], ['chiang-mai', '清迈', 'Chiang Mai', 99.0]] },
    { code: 'VN', zh: '越南', en: 'Vietnam', cities: [['hanoi', '河内', 'Hanoi', 105.8], ['ho-chi-minh-city', '胡志明市', 'Ho Chi Minh City', 106.7]] },
    { code: 'ID', zh: '印度尼西亚', en: 'Indonesia', cities: [
      ['jakarta', '雅加达', 'Jakarta', 106.8], ['surabaya', '泗水', 'Surabaya', 112.8], ['denpasar', '登巴萨', 'Denpasar', 115.2]
    ] },
    { code: 'PH', zh: '菲律宾', en: 'Philippines', cities: [['manila', '马尼拉', 'Manila', 121.0], ['cebu', '宿务', 'Cebu', 123.9]] },
    { code: 'IN', zh: '印度', en: 'India', cities: [
      ['new-delhi', '新德里', 'New Delhi', 77.2], ['mumbai', '孟买', 'Mumbai', 72.9],
      ['bengaluru', '班加罗尔', 'Bengaluru', 77.6], ['kolkata', '加尔各答', 'Kolkata', 88.4]
    ] },
    { code: 'AE', zh: '阿联酋', en: 'United Arab Emirates', cities: [['dubai', '迪拜', 'Dubai', 55.3], ['abu-dhabi', '阿布扎比', 'Abu Dhabi', 54.4]] },
    { code: 'SA', zh: '沙特阿拉伯', en: 'Saudi Arabia', cities: [['riyadh', '利雅得', 'Riyadh', 46.7], ['jeddah', '吉达', 'Jeddah', 39.2]] },
    { code: 'AU', zh: '澳大利亚', en: 'Australia', cities: [
      ['sydney', '悉尼', 'Sydney', 151.2], ['melbourne', '墨尔本', 'Melbourne', 145.0], ['brisbane', '布里斯班', 'Brisbane', 153.0],
      ['perth', '珀斯', 'Perth', 115.9], ['adelaide', '阿德莱德', 'Adelaide', 138.6]
    ] },
    { code: 'NZ', zh: '新西兰', en: 'New Zealand', cities: [['auckland', '奥克兰', 'Auckland', 174.8], ['wellington', '惠灵顿', 'Wellington', 174.8]] },
    { code: 'US', zh: '美国', en: 'United States', cities: [
      ['new-york', '纽约', 'New York', -74.0], ['los-angeles', '洛杉矶', 'Los Angeles', -118.2],
      ['san-francisco', '旧金山', 'San Francisco', -122.4], ['chicago', '芝加哥', 'Chicago', -87.6],
      ['seattle', '西雅图', 'Seattle', -122.3], ['boston', '波士顿', 'Boston', -71.1],
      ['houston', '休斯敦', 'Houston', -95.4], ['honolulu', '火奴鲁鲁', 'Honolulu', -157.9]
    ] },
    { code: 'CA', zh: '加拿大', en: 'Canada', cities: [
      ['toronto', '多伦多', 'Toronto', -79.4], ['vancouver', '温哥华', 'Vancouver', -123.1],
      ['montreal', '蒙特利尔', 'Montreal', -73.6], ['calgary', '卡尔加里', 'Calgary', -114.1]
    ] },
    { code: 'GB', zh: '英国', en: 'United Kingdom', cities: [
      ['london', '伦敦', 'London', -0.1], ['manchester', '曼彻斯特', 'Manchester', -2.2], ['edinburgh', '爱丁堡', 'Edinburgh', -3.2]
    ] },
    { code: 'FR', zh: '法国', en: 'France', cities: [['paris', '巴黎', 'Paris', 2.4], ['lyon', '里昂', 'Lyon', 4.8]] },
    { code: 'DE', zh: '德国', en: 'Germany', cities: [['berlin', '柏林', 'Berlin', 13.4], ['munich', '慕尼黑', 'Munich', 11.6], ['frankfurt', '法兰克福', 'Frankfurt', 8.7]] },
    { code: 'IT', zh: '意大利', en: 'Italy', cities: [['rome', '罗马', 'Rome', 12.5], ['milan', '米兰', 'Milan', 9.2]] },
    { code: 'ES', zh: '西班牙', en: 'Spain', cities: [['madrid', '马德里', 'Madrid', -3.7], ['barcelona', '巴塞罗那', 'Barcelona', 2.2]] },
    { code: 'NL', zh: '荷兰', en: 'Netherlands', cities: [['amsterdam', '阿姆斯特丹', 'Amsterdam', 4.9]] },
    { code: 'CH', zh: '瑞士', en: 'Switzerland', cities: [['zurich', '苏黎世', 'Zurich', 8.5], ['geneva', '日内瓦', 'Geneva', 6.1]] },
    { code: 'ZA', zh: '南非', en: 'South Africa', cities: [['johannesburg', '约翰内斯堡', 'Johannesburg', 28.0], ['cape-town', '开普敦', 'Cape Town', 18.4]] },
    { code: 'EG', zh: '埃及', en: 'Egypt', cities: [['cairo', '开罗', 'Cairo', 31.2]] },
    { code: 'BR', zh: '巴西', en: 'Brazil', cities: [['sao-paulo', '圣保罗', 'São Paulo', -46.6], ['rio-de-janeiro', '里约热内卢', 'Rio de Janeiro', -43.2]] },
    { code: 'MX', zh: '墨西哥', en: 'Mexico', cities: [['mexico-city', '墨西哥城', 'Mexico City', -99.1]] }
  ]);
})(window);
