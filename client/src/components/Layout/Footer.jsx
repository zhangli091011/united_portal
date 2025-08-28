import { useTheme } from '../../contexts/ThemeContext'

const Footer = () => {
  const { theme } = useTheme()
  
  const handleLinkClick = (e, href) => {
    if (href === '#' || !href) {
      e.preventDefault()
      alert('该页面正在建设中，敬请期待！')
    } else {
      e.preventDefault()
      window.open(href, '_blank')
    }
  }

  const handleSocialClick = (platform) => {
    alert(`${platform}账号信息正在整理中，敬请期待！`)
  }
  
  return (
    <footer className="footer-dark">
      <div className="footer-container-dark">
        <div className="footer-content-dark">
          {/* Logo和描述区域 */}
          <div className="footer-section-dark footer-logo-section-dark footer-logo-responsive-dark">
            <div className="footer-logo-container-dark">
              <div className="footer-logo-dark footer-logo-scaled-dark">
                {theme.logoUrlDark && (
                  <a href="https://youthgala.quantumlight.cc" target="_blank">
                    <img 
                      href="https://youthgala.quantumlight.cc"
                      src={theme.logoUrlDark} 
                      alt="QuantumLight Logo" 
                      className="footer-logo-image"
                      style={{
                        left: 'center',
                        top: 'center',
                        width: '100px',
                        height: '100px'
                      }}
                    />
                  </a>
                  )}
                
              </div>
              <p className="footer-description-dark footer-description-responsive-dark">
                QuantumLight量子光隅学生自媒体团队
              </p>
            </div>
          </div>
          
          {/* 量子中春晚 */}
          <div className="footer-section-dark">
            <h4 className="footer-title-dark">量子中春晚</h4>
            <div className="footer-links-dark">
              <a 
                href="https://mp.weixin.qq.com/s/ppbzYufACGaPbQ_QDXpmyw" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://mp.weixin.qq.com/s/ppbzYufACGaPbQ_QDXpmyw')}
              >
                报名须知
              </a>
              <a 
                href="https://participate.youthgala.quantumlight.cc" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://participate.youthgala.quantumlight.cc')}
              >
                报名系统
              </a>
              <a 
                href="https://data.youthgala.quantumlight.cc" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://data.youthgala.quantumlight.cc')}
              >
                数据大屏
              </a>
              <a 
                href="https://youthgala.quantumlight.cc" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://youthgala.quantumlight.cc')}
              >
                项目官网
              </a>
            </div>
          </div>
          
          {/* 反霸凌控诉 */}
          <div className="footer-section-dark">
            <h4 className="footer-title-dark">反霸凌控诉</h4>
            <div className="footer-links-dark">
              <a 
                href="https://about.monologue.quantumlight.cc" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://about.monologue.quantumlight.cc')}
              >
                项目初衷
              </a>
              <a 
                href="https://monologue.quantumlight.cc" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://monologue.quantumlight.cc')}
              >
                项目官网
              </a>
            </div>
          </div>
          
          {/* 友情链接 */}
          <div className="footer-section-dark">
            <h4 className="footer-title-dark">友情链接</h4>
            <div className="footer-links-dark">
              <a 
                href="https://shanhe.co" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://shanhe.co')}
              >
                山河大学
              </a>
              <a 
                href="https://www.lz-s.cn" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, 'https://www.lz-s.cn')}
              >
                量子星辰
              </a>
              <a 
                href="#" 
                className="footer-link-dark"
                onClick={(e) => handleLinkClick(e, '#')}
              >
                特别鸣谢
              </a>
            </div>
            
            {/* 社交媒体图标 */}
            <div className="social-icons-dark">
              {/* 微信图标 */}
              <div 
                className="social-icon-dark" 
                title="微信"
                onClick={() => handleSocialClick('微信')}
              >
                <svg viewBox="0 0 26 21" fill="none" className="social-svg-wechat">
                  <path d="M17.4375 14.625Q17.9062 14.625 18.3281 14.5781Q17.6719 17.3906 15.0938 19.1719Q12.5625 20.9531 9.14062 21Q5.25 20.9062 2.67188 18.75Q0.09375 16.5938 0 13.2656Q0.09375 9.46875 3.65625 7.07812L2.76562 4.3125L5.95312 5.90625Q6.1875 5.85938 6.46875 5.8125Q7.78125 5.53125 9.14062 5.48438Q9.5625 5.48438 9.98438 5.53125Q9.70312 6.42188 9.70312 7.40625Q9.79688 10.5 11.9531 12.5156Q14.1094 14.5781 17.4375 14.625ZM12.5625 17.1094Q13.6406 17.0625 13.6875 15.9844Q13.6406 14.9062 12.5625 14.8594Q12 14.8594 11.625 15.1406Q11.2031 15.4688 11.1562 15.9844Q11.2031 16.5 11.625 16.8281Q12 17.1094 12.5625 17.1094ZM6.14062 14.8594Q5.625 14.8594 5.20312 15.1406Q4.78125 15.4688 4.78125 15.9844Q4.78125 16.5 5.20312 16.8281Q5.625 17.1094 6.14062 17.1094Q7.26562 17.0625 7.3125 15.9844Q7.26562 14.9062 6.14062 14.8594ZM25.7812 7.54688Q25.6875 10.3594 23.4375 12.1875Q21.1875 14.0625 18.0469 14.1562Q14.6719 14.0625 12.5156 12.1875Q10.3594 10.3594 10.2656 7.54688Q10.3594 4.73438 12.5156 2.85938Q14.6719 0.984375 18.0469 0.890625Q19.3125 0.9375 20.625 1.3125Q20.6719 1.35938 20.7656 1.35938L23.2969 0L22.5938 2.25Q24 3.32812 24.8906 4.64062Q25.7344 6 25.7812 7.54688ZM15.5156 8.67188Q15.1406 8.67188 14.9062 8.95312Q14.625 9.23438 14.625 9.60938Q14.625 9.9375 14.9062 10.2188Q15.1406 10.5 15.5156 10.5Q16.5938 10.4062 16.6406 9.60938Q16.5938 8.76562 15.5156 8.67188ZM20.5312 8.67188Q20.1562 8.67188 19.9219 8.95312Q19.6406 9.23438 19.6406 9.60938Q19.6406 9.9375 19.9219 10.2188Q20.1562 10.5 20.5312 10.5Q21.6094 10.4062 21.6562 9.60938Q21.6094 8.76562 20.5312 8.67188Z"/>
                </svg>
              </div>
              
              {/* 抖音图标 */}
              <div 
                className="social-icon-dark" 
                title="抖音"
                onClick={() => handleSocialClick('抖音')}
              >
                <svg viewBox="0 0 18 20" fill="none">
                  <path d="M13 6.24537L13 13.5C13 17.0899 10.0899 20 6.5 20C2.91015 20 0 17.0899 0 13.5C0 9.9101 2.91015 7 6.5 7C7.0163 7 7.5185 7.06019 8 7.17393L8 10.3368C7.5454 10.1208 7.0368 10 6.5 10C4.567 10 3 11.567 3 13.5C3 15.433 4.567 17 6.5 17C8.433 17 10 15.433 10 13.5L10 0L13 0C13 2.76142 15.2386 5 18 5L18 8C16.1081 8 14.3696 7.34328 13 6.24537Z"/>
                </svg>
              </div>
              
              {/* B站图标 */}
              <div 
                className="social-icon-dark" 
                title="哔哩哔哩"
                onClick={() => handleSocialClick('哔哩哔哩')}
              >
                <svg viewBox="0 0 24 22" fill="none" className="social-svg-bilibili">
                  <path d="M22.8327 16.875Q24 15.6094 23.9066 13.7812L23.9066 4.3125Q23.8599 2.4375 22.6459 1.26562Q21.4786 0.046875 19.6109 0L4.29572 0Q2.42802 0.046875 1.2607 1.26562Q0.0466926 2.48438 0 4.5L0 13.7812Q0.0466926 15.6094 1.2607 16.875Q2.42802 18.0469 4.29572 18.0938L5.64981 18.0938L4.48249 19.3125Q4.06226 19.6875 4.06226 20.3438Q4.06226 20.9531 4.48249 21.3281Q4.90272 21.75 5.50973 21.75Q6.11673 21.75 6.53696 21.3281L9.94553 18.0938L14.0545 18.0938L17.5564 21.3281Q17.9767 21.75 18.5837 21.75Q19.1907 21.75 19.6109 21.3281Q19.9844 20.9531 20.0311 20.3438Q19.9844 19.6875 19.6109 19.3125L18.4436 18.0938L19.7977 18.0938Q21.6654 18.0469 22.8327 16.875ZM21.0117 13.5937Q20.965 14.2969 20.4981 14.7187Q20.0778 15.1406 19.4241 15.1406L4.48249 15.1406Q3.82879 15.1406 3.36187 14.7187Q2.94163 14.2969 2.94163 13.5937L2.94163 4.5Q2.94163 3.84375 3.36187 3.375Q3.82879 2.95312 4.48249 2.90625L19.4241 2.90625Q20.0778 2.95312 20.5447 3.375Q20.965 3.84375 21.0117 4.5L21.0117 13.5937ZM8.68482 11.5781Q9.10506 11.1562 9.15175 10.5L9.15175 8.95312Q9.10506 8.29688 8.68482 7.875Q8.26459 7.40625 7.5642 7.40625Q6.91051 7.40625 6.49027 7.875Q6.02335 8.29688 6.02335 8.95312L6.02335 10.5Q6.02335 11.1562 6.49027 11.5781Q6.91051 12.0469 7.5642 12.0469Q8.2179 12.0469 8.68482 11.5781ZM17.6031 11.5781Q18.0233 11.1562 18.07 10.5L18.07 8.95312Q18.0233 8.29688 17.6031 7.875Q17.1829 7.40625 16.5292 7.40625Q15.8288 7.40625 15.4086 7.875Q14.9416 8.29688 14.9416 8.95312L14.9416 10.5Q14.9883 11.1562 15.4086 11.5781Q15.8755 12.0469 16.5292 12.0469Q17.1829 12.0469 17.6031 11.5781Z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* 版权信息 */}
        <div className="footer-copyright-dark">
          <p className="footer-copyright-text-dark">© QuantumLight量子光隅团队 2024-2025 All rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer