import{l as ut,m as Ut,q as Mt,t as M,v as Ft,w as G,x as F,y as Ot,D as Tt,T as ke,A as x,B as $,E as z,F as m,H as p,J as L,M as d,O as Gt,P as b,Q as ue,R as zt,S as pt,U as At,V as Lt,W as ht,X as Pt}from"./main-BW4ASiSZ.js";function gt(e){var i,t,c="";if(typeof e=="string"||typeof e=="number")c+=e;else if(typeof e=="object")if(Array.isArray(e)){var l=e.length;for(i=0;i<l;i++)e[i]&&(t=gt(e[i]))&&(c&&(c+=" "),c+=t)}else for(t in e)e[t]&&(c&&(c+=" "),c+=t);return c}function Z(){for(var e,i,t=0,c="",l=arguments.length;t<l;t++)(e=arguments[t])&&(i=gt(e))&&(c&&(c+=" "),c+=i);return c}let Dt={data:""},Et=e=>typeof window=="object"?((e?e.querySelector("#_goober"):window._goober)||Object.assign((e||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:e||Dt,Rt=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Bt=/\/\*[^]*?\*\/|  +/g,ot=/\n+/g,A=(e,i)=>{let t="",c="",l="";for(let r in e){let o=e[r];r[0]=="@"?r[1]=="i"?t=r+" "+o+";":c+=r[1]=="f"?A(o,r):r+"{"+A(o,r[1]=="k"?"":i)+"}":typeof o=="object"?c+=A(o,i?i.replace(/([^,])+/g,n=>r.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,s=>/&/.test(s)?s.replace(/&/g,n):n?n+" "+s:s)):r):o!=null&&(r=/^--/.test(r)?r:r.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=A.p?A.p(r,o):r+":"+o+";")}return t+(i&&l?i+"{"+l+"}":l)+c},T={},vt=e=>{if(typeof e=="object"){let i="";for(let t in e)i+=t+vt(e[t]);return i}return e},jt=(e,i,t,c,l)=>{let r=vt(e),o=T[r]||(T[r]=(s=>{let a=0,f=11;for(;a<s.length;)f=101*f+s.charCodeAt(a++)>>>0;return"go"+f})(r));if(!T[o]){let s=r!==e?e:(a=>{let f,h,v=[{}];for(;f=Rt.exec(a.replace(Bt,""));)f[4]?v.shift():f[3]?(h=f[3].replace(ot," ").trim(),v.unshift(v[0][h]=v[0][h]||{})):v[0][f[1]]=f[2].replace(ot," ").trim();return v[0]})(e);T[o]=A(l?{["@keyframes "+o]:s}:s,t?"":"."+o)}let n=t&&T.g?T.g:null;return t&&(T.g=T[o]),((s,a,f,h)=>{h?a.data=a.data.replace(h,s):a.data.indexOf(s)===-1&&(a.data=f?s+a.data:a.data+s)})(T[o],i,c,n),o},Ht=(e,i,t)=>e.reduce((c,l,r)=>{let o=i[r];if(o&&o.call){let n=o(t),s=n&&n.props&&n.props.className||/^go/.test(n)&&n;o=s?"."+s:n&&typeof n=="object"?n.props?"":A(n,""):n===!1?"":n}return c+l+(o??"")},"");function pe(e){let i=this||{},t=e.call?e(i.p):e;return jt(t.unshift?t.raw?Ht(t,[].slice.call(arguments,1),i.p):t.reduce((c,l)=>Object.assign(c,l&&l.call?l(i.p):l),{}):t,Et(i.target),i.g,i.o,i.k)}pe.bind({g:1});pe.bind({k:1});const fe=(e,i)=>e===i||e.length===i.length&&e.every((t,c)=>t===i[c]),It=ut;function J(e,i,t,c){return e.addEventListener(i,t,c),It(e.removeEventListener.bind(e,i,t,c))}function we(e,i=Ut()){let t=0,c,l;return()=>(t++,ut(()=>{t--,queueMicrotask(()=>{!t&&l&&(l(),l=c=void 0)})}),l||Mt(r=>c=e(l=r),i),c)}function lt(e,i){for(let t=e.length-1;t>=0;t--){const c=i.slice(0,t+1);if(!fe(e[t],c))return!1}return!0}const $t=we(()=>{const[e,i]=F(null);return J(window,"keydown",t=>{i(t),setTimeout(()=>i(null))}),e}),Kt=we(()=>{const[e,i]=F([]),t=()=>i([]),c=$t();return J(window,"keydown",l=>{if(l.repeat||typeof l.key!="string")return;const r=l.key.toUpperCase(),o=e();if(o.includes(r))return;const n=[...o,r];o.length===0&&r!=="ALT"&&r!=="CONTROL"&&r!=="META"&&r!=="SHIFT"&&(l.shiftKey&&n.unshift("SHIFT"),l.altKey&&n.unshift("ALT"),l.ctrlKey&&n.unshift("CONTROL"),l.metaKey&&n.unshift("META")),i(n)}),J(window,"keyup",l=>{if(typeof l.key!="string")return;const r=l.key.toUpperCase();i(o=>o.filter(n=>n!==r))}),J(window,"blur",t),J(window,"contextmenu",l=>{l.defaultPrevented||t()}),e[0]=e,e[1]={event:c},e[Symbol.iterator]=function*(){yield e[0],yield e[1]},e}),qt=we(()=>{const e=Kt();return G(i=>e().length===0?[]:[...i,e()],[])});function Nt(e,i,t={}){if(!e.length)return;e=e.map(a=>a.toUpperCase());const{preventDefault:c=!0}=t,l=$t(),r=qt();let o=!1;const n=a=>{if(!a.length)return o=!1;if(o)return;const f=l();a.length<e.length?lt(a,e.slice(0,a.length))?c&&f&&f.preventDefault():o=!0:(o=!0,lt(a,e)&&(c&&f&&f.preventDefault(),i(f)))},s=a=>{const f=a.at(-1);if(!f)return;const h=l();if(c&&f.length<e.length){fe(f,e.slice(0,e.length-1))&&h&&h.preventDefault();return}if(fe(f,e)){const v=a.at(-2);(!v||fe(v,e.slice(0,e.length-1)))&&(c&&h&&h.preventDefault(),i(h))}};M(Ft(r,t.requireReset?n:s))}const Se=()=>{const e=Ot(Tt);if(e===void 0)throw new Error("useDevtoolsShellContext must be used within a ShellContextProvider");return e},Wt=()=>{const{store:e,setStore:i}=Se(),t=G(()=>e.plugins),c=G(()=>e.state.activePlugin);return{plugins:t,setActivePlugin:r=>{i(o=>({...o,state:{...o.state,activePlugin:r}}))},activePlugin:c}},he=()=>{const{store:e,setStore:i}=Se();return{state:G(()=>e.state),setState:l=>{i(r=>({...r,state:{...r.state,...l}}))}}},Q=()=>{const{store:e,setStore:i}=Se(),t=G(()=>e.settings);return{setSettings:l=>{i(r=>({...r,settings:{...r.settings,...l}}))},settings:t}},Yt=()=>{const{state:e,setState:i}=he();return{persistOpen:G(()=>e().persistOpen),setPersistOpen:l=>{i({persistOpen:l})}}},mt=()=>{const{state:e,setState:i}=he();return{height:G(()=>e().height),setHeight:l=>{i({height:l})}}},xt=(e,i=!0)=>{i?e.setAttribute("tabIndex","-1"):e.removeAttribute("tabIndex");for(const t of e.children)xt(t,i)},Vt=e=>{M(()=>{const i=document.getElementById(ke);i&&xt(i,!e())})},st={colors:{darkGray:{800:"#111318"},gray:{100:"#f2f4f7",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054"},purple:{400:"#9B8AFB",500:"#7A5AF8"}},alpha:{20:"33"},font:{fontFamily:{sans:"ui-sans-serif, Inter, system-ui, sans-serif, sans-serif",mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"}},size:{.5:"calc(var(--tsrd-font-size) * 0.125)",12:"calc(var(--tsrd-font-size) * 3)"}},Jt=()=>{const{colors:e,font:i,size:t,alpha:c}=st,{fontFamily:l}=i,r=pe;return{logo:r`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      width: ${t[12]};
      height: ${t[12]};
      font-family: ${l.sans};
      gap: ${st.size[.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
    `,selectWrapper:r`
      width: 100%;
      max-width: 300px;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    `,selectContainer:r`
      width: 100%;
    `,selectLabel:r`
      font-size: 0.875rem;
      font-weight: 500;
      color: ${e.gray[100]};
    `,selectDescription:r`
      font-size: 0.8rem;
      color: ${e.gray[400]};
      margin: 0;
      line-height: 1.3;
    `,select:r`
      appearance: none;
      width: 100%;
      padding: 0.75rem 3rem 0.75rem 0.75rem;
      border-radius: 0.5rem;
      background-color: ${e.darkGray[800]};
      color: ${e.gray[100]};
      border: 1px solid ${e.gray[700]};
      font-size: 0.875rem;
      transition: all 0.2s ease;
      cursor: pointer;

      /* Custom arrow */
      background-image: url("data:image/svg+xml;utf8,<svg fill='%236b7280' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1.25rem;

      &:hover {
        border-color: ${e.gray[600]};
      }

      &:focus {
        outline: none;
        border-color: ${e.purple[400]};
        box-shadow: 0 0 0 3px ${e.purple[400]}${c[20]};
      }
    `,inputWrapper:r`
      width: 100%;
      max-width: 300px;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    `,inputContainer:r`
      width: 100%;
    `,inputLabel:r`
      font-size: 0.875rem;
      font-weight: 500;
      color: ${e.gray[100]};
    `,inputDescription:r`
      font-size: 0.8rem;
      color: ${e.gray[400]};
      margin: 0;
      line-height: 1.3;
    `,input:r`
      appearance: none;
      width: 100%;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background-color: ${e.darkGray[800]};
      color: ${e.gray[100]};
      border: 1px solid ${e.gray[700]};
      font-size: 0.875rem;
      font-family: ${l.mono};
      transition: all 0.2s ease;

      &::placeholder {
        color: ${e.gray[500]};
      }

      &:hover {
        border-color: ${e.gray[600]};
      }

      &:focus {
        outline: none;
        border-color: ${e.purple[400]};
        box-shadow: 0 0 0 3px ${e.purple[400]}${c[20]};
      }
    `,checkboxWrapper:r`
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      user-select: none;
      padding: 0.5rem;
      border-radius: 0.5rem;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: ${e.darkGray[800]};
      }
    `,checkboxContainer:r`
      width: 100%;
    `,checkboxLabelContainer:r`
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    `,checkbox:r`
      appearance: none;
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid ${e.gray[700]};
      border-radius: 0.375rem;
      background-color: ${e.darkGray[800]};
      display: grid;
      place-items: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
      margin-top: 0.125rem;

      &:hover {
        border-color: ${e.purple[400]};
      }

      &:checked {
        background-color: ${e.purple[500]};
        border-color: ${e.purple[500]};
      }

      &:checked::after {
        content: '';
        width: 0.4rem;
        height: 0.6rem;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        margin-top: -3px;
      }
    `,checkboxLabel:r`
      color: ${e.gray[100]};
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
    `,checkboxDescription:r`
      color: ${e.gray[400]};
      font-size: 0.8rem;
      line-height: 1.3;
    `}};function ge(){const[e]=F(Jt());return e}var Zt=x("<div><label><input type=checkbox><div>"),at=x("<span>");function be(e){const i=ge(),[t,c]=F(e.checked||!1),l=r=>{var n;const o=r.target.checked;c(o),(n=e.onChange)==null||n.call(e,o)};return(()=>{var r=Zt(),o=r.firstChild,n=o.firstChild,s=n.nextSibling;return n.$$input=l,$(s,(()=>{var a=z(()=>!!e.label);return()=>a()&&(()=>{var f=at();return $(f,()=>e.label),m(()=>p(f,i().checkboxLabel)),f})()})(),null),$(s,(()=>{var a=z(()=>!!e.description);return()=>a()&&(()=>{var f=at();return $(f,()=>e.description),m(()=>p(f,i().checkboxDescription)),f})()})(),null),m(a=>{var f=i().checkboxContainer,h=i().checkboxWrapper,v=i().checkbox,g=i().checkboxLabelContainer;return f!==a.e&&p(r,a.e=f),h!==a.t&&p(o,a.t=h),v!==a.a&&p(n,a.a=v),g!==a.o&&p(s,a.o=g),a},{e:void 0,t:void 0,a:void 0,o:void 0}),m(()=>n.checked=t()),r})()}L(["input"]);var Qt=x("<div><div><input>"),Xt=x("<label>"),ei=x("<p>");function dt(e){const i=ge(),[t,c]=F(e.value||""),l=r=>{var n;const o=r.target.value;c(s=>s!==o?o:s),(n=e.onChange)==null||n.call(e,o)};return(()=>{var r=Qt(),o=r.firstChild,n=o.firstChild;return $(o,(()=>{var s=z(()=>!!e.label);return()=>s()&&(()=>{var a=Xt();return $(a,()=>e.label),m(()=>p(a,i().inputLabel)),a})()})(),n),$(o,(()=>{var s=z(()=>!!e.description);return()=>s()&&(()=>{var a=ei();return $(a,()=>e.description),m(()=>p(a,i().inputDescription)),a})()})(),n),n.$$input=l,m(s=>{var a=i().inputContainer,f=i().inputWrapper,h=e.type||"text",v=i().input,g=e.placeholder;return a!==s.e&&p(r,s.e=a),f!==s.t&&p(o,s.t=f),h!==s.a&&d(n,"type",s.a=h),v!==s.o&&p(n,s.o=v),g!==s.i&&d(n,"placeholder",s.i=g),s},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0}),m(()=>n.value=t()),r})()}L(["input"]);var ti=x("<div><div><select>"),ii=x("<label>"),ri=x("<p>"),ni=x("<option>");function ct(e){var r;const i=ge(),[t,c]=F(e.value||((r=e.options[0])==null?void 0:r.value)),l=o=>{var s;const n=o.target.value;c(a=>a!==n?n:a),(s=e.onChange)==null||s.call(e,n)};return(()=>{var o=ti(),n=o.firstChild,s=n.firstChild;return $(n,(()=>{var a=z(()=>!!e.label);return()=>a()&&(()=>{var f=ii();return $(f,()=>e.label),m(()=>p(f,i().selectLabel)),f})()})(),s),$(n,(()=>{var a=z(()=>!!e.description);return()=>a()&&(()=>{var f=ri();return $(f,()=>e.description),m(()=>p(f,i().selectDescription)),f})()})(),s),s.$$input=l,$(s,()=>e.options.map(a=>(()=>{var f=ni();return $(f,()=>a.label),m(()=>f.value=a.value),f})())),m(a=>{var f=i().selectContainer,h=i().selectWrapper,v=i().select;return f!==a.e&&p(o,a.e=f),h!==a.t&&p(n,a.t=h),v!==a.a&&p(s,a.a=v),a},{e:void 0,t:void 0,a:void 0}),m(()=>s.value=t()),o})()}L(["input"]);var oi=x('<svg xmlns=http://www.w3.org/2000/svg enable-background="new 0 0 634 633"viewBox="0 0 634 633"><g transform=translate(1)><linearGradient x1=-641.486 x2=-641.486 y1=856.648 y2=855.931 gradientTransform="matrix(633 0 0 -633 406377 542258)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#6bdaff></stop><stop offset=0.319 stop-color=#f9ffb5></stop><stop offset=0.706 stop-color=#ffa770></stop><stop offset=1 stop-color=#ff7373></stop></linearGradient><circle cx=316.5 cy=316.5 r=316.5 fill-rule=evenodd clip-rule=evenodd></circle><defs><filter width=454 height=396.9 x=-137.5 y=412 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=412 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=610.5 fill=#015064 fill-rule=evenodd stroke=#00CFE2 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=412 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=412 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=610.5 fill=#015064 fill-rule=evenodd stroke=#00CFE2 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=-137.5 y=450 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=450 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=648.5 fill=#015064 fill-rule=evenodd stroke=#00A8B8 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=450 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=450 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=648.5 fill=#015064 fill-rule=evenodd stroke=#00A8B8 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=-137.5 y=486 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=486 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=684.5 fill=#015064 fill-rule=evenodd stroke=#007782 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=486 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=486 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=684.5 fill=#015064 fill-rule=evenodd stroke=#007782 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=176.9 height=129.3 x=272.2 y=308 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=176.9 height=129.3 x=272.2 y=308 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><path fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11 d="M436 403.2l-5 28.6m-140-90.3l-10.9 62m52.8-19.4l-4.3 27.1"></path><linearGradient x1=-645.656 x2=-646.499 y1=854.878 y2=854.788 gradientTransform="matrix(-184.159 -32.4722 11.4608 -64.9973 -128419.844 34938.836)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ee2700></stop><stop offset=1 stop-color=#ff008e></stop></linearGradient><path fill-rule=evenodd d="M344.1 363l97.7 17.2c5.8 2.1 8.2 6.2 7.1 12.1-1 5.9-4.7 9.2-11 9.9l-106-18.7-57.5-59.2c-3.2-4.8-2.9-9.1.8-12.8 3.7-3.7 8.3-4.4 13.7-2.1l55.2 53.6z"clip-rule=evenodd></path><path fill=#D8D8D8 fill-rule=evenodd stroke=#FFF stroke-linecap=round stroke-linejoin=bevel stroke-width=7 d="M428.3 384.5l.9-6.5m-33.9 1.5l.9-6.5m-34 .5l.9-6.1m-38.9-16.1l4.2-3.9m-25.2-16.1l4.2-3.9"clip-rule=evenodd></path></g><defs><filter width=280.6 height=317.4 x=73.2 y=113.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=280.6 height=317.4 x=73.2 y=113.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><linearGradient x1=-646.8 x2=-646.8 y1=854.844 y2=853.844 gradientTransform="matrix(-100.1751 48.8587 -97.9753 -200.879 19124.773 203538.61)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#a17500></stop><stop offset=1 stop-color=#5d2100></stop></linearGradient><path fill-rule=evenodd d="M192.3 203c8.1 37.3 14 73.6 17.8 109.1 3.8 35.4 2.8 75.2-2.9 119.2l61.2-16.7c-15.6-59-25.2-97.9-28.6-116.6-3.4-18.7-10.8-51.8-22.2-99.6l-25.3 4.6"clip-rule=evenodd></path><linearGradient x1=-635.467 x2=-635.467 y1=852.115 y2=851.115 gradientTransform="matrix(92.6873 4.8575 2.0257 -38.6535 57323.695 36176.047)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M195 183.9s-12.6-22.1-36.5-29.9c-15.9-5.2-34.4-1.5-55.5 11.1 15.9 14.3 29.5 22.6 40.7 24.9 16.8 3.6 51.3-6.1 51.3-6.1z"clip-rule=evenodd></path><linearGradient x1=-636.573 x2=-636.573 y1=855.444 y2=854.444 gradientTransform="matrix(109.9945 5.7646 6.3597 -121.3507 64719.133 107659.336)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5s-47.5-8.5-83.2 15.7c-23.8 16.2-34.3 49.3-31.6 99.3 30.3-27.8 52.1-48.5 65.2-61.9 19.8-20 49.6-53.1 49.6-53.1z"clip-rule=evenodd></path><linearGradient x1=-632.145 x2=-632.145 y1=854.174 y2=853.174 gradientTransform="matrix(62.9558 3.2994 3.5021 -66.8246 37035.367 59284.227)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M195 183.9c-.8-21.9 6-38 20.6-48.2 14.6-10.2 29.8-15.3 45.5-15.3-6.1 21.4-14.5 35.8-25.2 43.4-10.7 7.5-24.4 14.2-40.9 20.1z"clip-rule=evenodd></path><linearGradient x1=-638.224 x2=-638.224 y1=853.801 y2=852.801 gradientTransform="matrix(152.4666 7.9904 3.0934 -59.0251 94939.86 55646.855)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c31.9-30 64.1-39.7 96.7-29 32.6 10.7 50.8 30.4 54.6 59.1-35.2-5.5-60.4-9.6-75.8-12.1-15.3-2.6-40.5-8.6-75.5-18z"clip-rule=evenodd></path><linearGradient x1=-637.723 x2=-637.723 y1=855.103 y2=854.103 gradientTransform="matrix(136.467 7.1519 5.2165 -99.5377 82830.875 89859.578)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c35.8-7.6 65.6-.2 89.2 22 23.6 22.2 37.7 49 42.3 80.3-39.8-9.7-68.3-23.8-85.5-42.4-17.2-18.5-32.5-38.5-46-59.9z"clip-rule=evenodd></path><linearGradient x1=-631.79 x2=-631.79 y1=855.872 y2=854.872 gradientTransform="matrix(60.8683 3.19 8.7771 -167.4773 31110.818 145537.61)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c-33.6 13.8-53.6 35.7-60.1 65.6-6.5 29.9-3.6 63.1 8.7 99.6 27.4-40.3 43.2-69.6 47.4-88 4.2-18.3 5.5-44.1 4-77.2z"clip-rule=evenodd></path><path fill=none stroke=#2F8A00 stroke-linecap=round stroke-width=8 d="M196.5 182.3c-14.8 21.6-25.1 41.4-30.8 59.4-5.7 18-9.4 33-11.1 45.1"></path><path fill=none stroke=#2F8A00 stroke-linecap=round stroke-width=8 d="M194.8 185.7c-24.4 1.7-43.8 9-58.1 21.8-14.3 12.8-24.7 25.4-31.3 37.8m99.1-68.9c29.7-6.7 52-8.4 67-5 15 3.4 26.9 8.7 35.8 15.9m-110.8-5.9c20.3 9.9 38.2 20.5 53.9 31.9 15.7 11.4 27.4 22.1 35.1 32"></path></g><defs><filter width=532 height=633 x=50.5 y=399 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=532 height=633 x=50.5 y=399 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><linearGradient x1=-641.104 x2=-641.278 y1=856.577 y2=856.183 gradientTransform="matrix(532 0 0 -633 341484.5 542657)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#fff400></stop><stop offset=1 stop-color=#3c8700></stop></linearGradient><ellipse cx=316.5 cy=715.5 fill-rule=evenodd clip-rule=evenodd rx=266 ry=316.5></ellipse><defs><filter width=288 height=283 x=391 y=-24 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=288 height=283 x=391 y=-24 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><g transform="translate(397 -24)"><linearGradient x1=-1036.672 x2=-1036.672 y1=880.018 y2=879.018 gradientTransform="matrix(227 0 0 -227 235493 199764)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffdf00></stop><stop offset=1 stop-color=#ff9d00></stop></linearGradient><circle cx=168.5 cy=113.5 r=113.5 fill-rule=evenodd clip-rule=evenodd></circle><linearGradient x1=-1017.329 x2=-1018.602 y1=658.003 y2=657.998 gradientTransform="matrix(30 0 0 -1 30558 771)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M30 113H0"></path><linearGradient x1=-1014.501 x2=-1015.774 y1=839.985 y2=839.935 gradientTransform="matrix(26.5 0 0 -5.5 26925 4696.5)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M33.5 79.5L7 74"></path><linearGradient x1=-1016.59 x2=-1017.862 y1=852.671 y2=852.595 gradientTransform="matrix(29 0 0 -8 29523 6971)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M34 146l-29 8"></path><linearGradient x1=-1011.984 x2=-1013.257 y1=863.523 y2=863.229 gradientTransform="matrix(24 0 0 -13 24339 11407)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M45 177l-24 13"></path><linearGradient x1=-1006.673 x2=-1007.946 y1=869.279 y2=868.376 gradientTransform="matrix(20 0 0 -19 20205 16720)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M67 204l-20 19"></path><linearGradient x1=-992.85 x2=-993.317 y1=871.258 y2=870.258 gradientTransform="matrix(13.8339 0 0 -22.8467 13825.796 20131.938)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M94.4 227l-13.8 22.8"></path><linearGradient x1=-953.835 x2=-953.965 y1=871.9 y2=870.9 gradientTransform="matrix(7.5 0 0 -24.5 7278 21605)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M127.5 243.5L120 268"></path><linearGradient x1=244.504 x2=244.496 y1=871.898 y2=870.898 gradientTransform="matrix(.5 0 0 -24.5 45.5 21614)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M167.5 252.5l.5 24.5">');function li(){const e=Gt(),i=ge();return(()=>{var t=oi(),c=t.firstChild,l=c.firstChild,r=l.nextSibling,o=r.nextSibling,n=o.firstChild,s=o.nextSibling,a=s.firstChild,f=s.nextSibling,h=f.nextSibling,v=h.firstChild,g=h.nextSibling,y=g.firstChild,S=g.nextSibling,k=S.nextSibling,U=k.firstChild,C=k.nextSibling,_=C.firstChild,w=C.nextSibling,X=w.nextSibling,ee=X.firstChild,D=X.nextSibling,I=D.firstChild,u=D.nextSibling,O=u.nextSibling,te=O.firstChild,E=O.nextSibling,ie=E.firstChild,K=E.nextSibling,q=K.nextSibling,re=q.firstChild,R=q.nextSibling,ne=R.firstChild,N=R.nextSibling,W=N.nextSibling,oe=W.firstChild,B=W.nextSibling,le=B.firstChild,j=B.nextSibling,se=j.firstChild,Y=se.nextSibling,ae=Y.nextSibling,V=j.nextSibling,de=V.firstChild,H=V.nextSibling,ce=H.firstChild,ve=H.nextSibling,Ce=ve.firstChild,_e=Ce.nextSibling,Ue=_e.nextSibling,Me=Ue.nextSibling,Fe=Me.nextSibling,Oe=Fe.nextSibling,Te=Oe.nextSibling,Ge=Te.nextSibling,ze=Ge.nextSibling,Ae=ze.nextSibling,Le=Ae.nextSibling,Pe=Le.nextSibling,De=Pe.nextSibling,bt=De.nextSibling,Ee=ve.nextSibling,yt=Ee.firstChild,$e=Ee.nextSibling,kt=$e.firstChild,Re=$e.nextSibling,me=Re.nextSibling,Be=me.nextSibling,wt=Be.firstChild,xe=Be.nextSibling,St=xe.firstChild,je=xe.nextSibling,Ct=je.firstChild,He=Ct.firstChild,Ie=He.nextSibling,Ke=Ie.nextSibling,qe=Ke.nextSibling,Ne=qe.nextSibling,We=Ne.nextSibling,Ye=We.nextSibling,Ve=Ye.nextSibling,Je=Ve.nextSibling,Ze=Je.nextSibling,Qe=Ze.nextSibling,Xe=Qe.nextSibling,et=Xe.nextSibling,tt=et.nextSibling,it=tt.nextSibling,rt=it.nextSibling,nt=rt.nextSibling,_t=nt.nextSibling;return d(l,"id",`a-${e}`),d(r,"fill",`url(#a-${e})`),d(n,"id",`b-${e}`),d(s,"id",`c-${e}`),d(a,"filter",`url(#b-${e})`),d(f,"mask",`url(#c-${e})`),d(v,"id",`d-${e}`),d(g,"id",`e-${e}`),d(y,"filter",`url(#d-${e})`),d(S,"mask",`url(#e-${e})`),d(U,"id",`f-${e}`),d(C,"id",`g-${e}`),d(_,"filter",`url(#f-${e})`),d(w,"mask",`url(#g-${e})`),d(ee,"id",`h-${e}`),d(D,"id",`i-${e}`),d(I,"filter",`url(#h-${e})`),d(u,"mask",`url(#i-${e})`),d(te,"id",`j-${e}`),d(E,"id",`k-${e}`),d(ie,"filter",`url(#j-${e})`),d(K,"mask",`url(#k-${e})`),d(re,"id",`l-${e}`),d(R,"id",`m-${e}`),d(ne,"filter",`url(#l-${e})`),d(N,"mask",`url(#m-${e})`),d(oe,"id",`n-${e}`),d(B,"id",`o-${e}`),d(le,"filter",`url(#n-${e})`),d(j,"mask",`url(#o-${e})`),d(Y,"id",`p-${e}`),d(ae,"fill",`url(#p-${e})`),d(de,"id",`q-${e}`),d(H,"id",`r-${e}`),d(ce,"filter",`url(#q-${e})`),d(ve,"mask",`url(#r-${e})`),d(Ce,"id",`s-${e}`),d(_e,"fill",`url(#s-${e})`),d(Ue,"id",`t-${e}`),d(Me,"fill",`url(#t-${e})`),d(Fe,"id",`u-${e}`),d(Oe,"fill",`url(#u-${e})`),d(Te,"id",`v-${e}`),d(Ge,"fill",`url(#v-${e})`),d(ze,"id",`w-${e}`),d(Ae,"fill",`url(#w-${e})`),d(Le,"id",`x-${e}`),d(Pe,"fill",`url(#x-${e})`),d(De,"id",`y-${e}`),d(bt,"fill",`url(#y-${e})`),d(yt,"id",`z-${e}`),d($e,"id",`A-${e}`),d(kt,"filter",`url(#z-${e})`),d(Re,"id",`B-${e}`),d(me,"fill",`url(#B-${e})`),d(me,"mask",`url(#A-${e})`),d(wt,"id",`C-${e}`),d(xe,"id",`D-${e}`),d(St,"filter",`url(#C-${e})`),d(je,"mask",`url(#D-${e})`),d(He,"id",`E-${e}`),d(Ie,"fill",`url(#E-${e})`),d(Ke,"id",`F-${e}`),d(qe,"stroke",`url(#F-${e})`),d(Ne,"id",`G-${e}`),d(We,"stroke",`url(#G-${e})`),d(Ye,"id",`H-${e}`),d(Ve,"stroke",`url(#H-${e})`),d(Je,"id",`I-${e}`),d(Ze,"stroke",`url(#I-${e})`),d(Qe,"id",`J-${e}`),d(Xe,"stroke",`url(#J-${e})`),d(et,"id",`K-${e}`),d(tt,"stroke",`url(#K-${e})`),d(it,"id",`L-${e}`),d(rt,"stroke",`url(#L-${e})`),d(nt,"id",`M-${e}`),d(_t,"stroke",`url(#M-${e})`),m(()=>d(t,"class",i().logo)),t})()}const si={colors:{darkGray:{700:"#191c24",800:"#111318"},gray:{100:"#f2f4f7",300:"#d0d5dd",400:"#98a2b3",700:"#344054"},blue:{800:"#1849A9"},red:{500:"#ef4444"},purple:{400:"#9B8AFB",500:"#7A5AF8"}},alpha:{90:"e5"},font:{size:{xs:"calc(var(--tsrd-font-size) * 0.75)",sm:"calc(var(--tsrd-font-size) * 0.875)"},fontFamily:{sans:"ui-sans-serif, Inter, system-ui, sans-serif, sans-serif"}},border:{radius:{full:"9999px"}},size:{2:"calc(var(--tsrd-font-size) * 0.5)",10:"calc(var(--tsrd-font-size) * 2.5)",48:"calc(var(--tsrd-font-size) * 12)"}},ai=()=>{const{colors:e,font:i,size:t,alpha:c,border:l}=si,{fontFamily:r,size:o}=i,n=pe;return{devtoolsPanelContainer:s=>n`
      direction: ltr;
      position: fixed;
      overflow-y: hidden;
      overflow-x: hidden;
      ${s}: 0;
      right: 0;
      z-index: 99999;
      width: 100%;

      max-height: 90%;
      border-top: 1px solid ${e.gray[700]};
      transform-origin: top;
    `,devtoolsPanelContainerVisibility:s=>n`
        visibility: ${s?"visible":"hidden"};
        height: ${s?"auto":"0"};
      `,devtoolsPanelContainerResizing:s=>s()?n`
          transition: none;
        `:n`
        transition: all 0.4s ease;
      `,devtoolsPanelContainerAnimation:(s,a)=>s?n`
          pointer-events: auto;
          transform: translateY(0);
        `:n`
        pointer-events: none;
        transform: translateY(${a}px);
      `,devtoolsPanel:n`
      display: flex;
      font-size: ${o.sm};
      font-family: ${r.sans};
      background-color: ${e.darkGray[700]};
      color: ${e.gray[300]};
      width: w-screen;
      flex-direction: row;
      overflow-x: hidden;
      overflow-y: hidden;
      height: 100%;
    `,dragHandle:s=>n`
      position: absolute;
      left: 0;
      ${s==="bottom"?"top":"bottom"}: 0;
      width: 100%;
      height: 4px;
      cursor: row-resize;
      user-select: none;
      z-index: 100000;
      &:hover {
        background-color: ${e.purple[400]}${c[90]};
      }
    `,mainCloseBtn:n`
      background: transparent;
      position: fixed;
      z-index: 99999;
      display: inline-flex;
      width: fit-content;
      cursor: pointer;
      appearance: none;
      border: 0;
      align-items: center;
      padding: 0;
      font-size: ${i.size.xs};
      cursor: pointer;
      transition: all 0.25s ease-out;
      &:hide-until-hover {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      }
      &:hide-until-hover:hover {
        opacity: 1;
        pointer-events: auto;
        visibility: visible;
      }
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${l.radius.full};
        outline: 2px solid ${e.blue[800]};
      }
    `,mainCloseBtnPosition:s=>n`
        ${s==="top-left"?`top: ${t[2]}; left: ${t[2]};`:""}
        ${s==="top-right"?`top: ${t[2]}; right: ${t[2]};`:""}
        ${s==="middle-left"?`top: 50%; left: ${t[2]}; transform: translateY(-50%);`:""}
        ${s==="middle-right"?`top: 50%; right: ${t[2]}; transform: translateY(-50%);`:""}
        ${s==="bottom-left"?`bottom: ${t[2]}; left: ${t[2]};`:""}
        ${s==="bottom-right"?`bottom: ${t[2]}; right: ${t[2]};`:""}
      `,mainCloseBtnAnimation:(s,a)=>s?n`
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      `:a?n`
              opacity: 0;

              &:hover {
                opacity: 1;
                pointer-events: auto;
                visibility: visible;
              }
            `:n`
              opacity: 1;
              pointer-events: auto;
              visibility: visible;
            `,tabContainer:n`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      height: 100%;
      background-color: ${e.darkGray[800]};
      border-right: 1px solid ${e.gray[700]};
      box-shadow: 0 1px 0 ${e.gray[700]};
      position: relative;
      width: ${t[10]};
    `,tab:n`
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: ${t[10]};
      cursor: pointer;
      font-size: ${o.sm};
      font-family: ${r.sans};
      color: ${e.gray[300]};
      background-color: transparent;
      border: none;
      transition: all 0.2s ease-in-out;
      border-left: 2px solid transparent;
      &:hover:not(.close):not(.active) {
        background-color: ${e.gray[700]};
        color: ${e.gray[100]};
        border-left: 2px solid ${e.purple[500]};
      }
      &.active {
        background-color: ${e.purple[500]};
        color: ${e.gray[100]};
        border-left: 2px solid ${e.purple[500]};
      }
      &.close {
        margin-top: auto;
        &:hover {
          background-color: ${e.gray[700]};
        }
        &:hover {
          color: ${e.red[500]};
        }
      }

      &.disabled {
        cursor: not-allowed;
        opacity: 0.2;
        pointer-events: none;
      }
      &.disabled:hover {
        background-color: transparent;
        color: ${e.gray[300]};
      }
    `,tabContent:n`
      transition: all 0.2s ease-in-out;
      width: 100%;
      height: 100%;
    `,pluginsTabPanel:n`
      display: flex;
      flex-direction: row;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `,pluginsTabSidebar:n`
      width: ${t[48]};
      background-color: ${e.darkGray[800]};
      border-right: 1px solid ${e.gray[700]};
      box-shadow: 0 1px 0 ${e.gray[700]};
      overflow-y: auto;
    `,pluginName:n`
      font-size: ${o.xs};
      font-family: ${r.sans};
      color: ${e.gray[300]};
      padding: ${t[2]};
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease-in-out;
      &:hover {
        background-color: ${e.gray[700]};
        color: ${e.gray[100]};
        padding: ${t[2]};
      }
      &.active {
        background-color: ${e.purple[500]};
        color: ${e.gray[100]};
      }
    `,pluginsTabContent:n`
      width: 100%;
      height: 100%;
      overflow-y: auto;
    `,settingsContainer:n`
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
      background-color: ${e.darkGray[700]};
    `,settingsSection:n`
      margin-bottom: 2rem;
      padding: 1.5rem;
      background-color: ${e.darkGray[800]};
      border: 1px solid ${e.gray[700]};
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `,sectionTitle:n`
      font-size: 1.125rem;
      font-weight: 600;
      color: ${e.gray[100]};
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid ${e.gray[700]};
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `,sectionIcon:n`
      color: ${e.purple[400]};
    `,sectionDescription:n`
      color: ${e.gray[400]};
      font-size: 0.875rem;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    `,settingsGroup:n`
      display: flex;
      flex-direction: column;
      gap: 1rem;
    `,conditionalSetting:n`
      margin-left: 1.5rem;
      padding-left: 1rem;
      border-left: 2px solid ${e.purple[400]};
      background-color: ${e.darkGray[800]};
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 0.5rem;
    `,settingRow:n`
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    `}};function P(){const[e]=F(ai());return e}var di=x('<button type=button aria-label="Open TanStack Devtools">');const ci=({isOpen:e,setIsOpen:i})=>{const{settings:t}=Q(),c=P(),l=G(()=>Z(c().mainCloseBtn,c().mainCloseBtnPosition(t().position),c().mainCloseBtnAnimation(e(),t().hideUntilHover)));return(()=>{var r=di();return r.$$click=()=>i(!e()),$(r,b(li,{})),m(()=>p(r,l())),r})()};L(["click"]);var fi=x("<div>");const ui=e=>{const i=P(),{height:t}=mt(),{settings:c}=Q();return(()=>{var l=fi();return d(l,"id",ke),$(l,()=>e.children),m(r=>{var o=t()+"px",n=Z(i().devtoolsPanelContainer(c().panelLocation),i().devtoolsPanelContainerAnimation(e.isOpen(),t()),i().devtoolsPanelContainerVisibility(e.isOpen()),i().devtoolsPanelContainerResizing(e.isResizing));return o!==r.e&&((r.e=o)!=null?l.style.setProperty("height",o):l.style.removeProperty("height")),n!==r.t&&p(l,r.t=n),r},{e:void 0,t:void 0}),l})()};var ft=x("<div>");const pi=e=>{const i=P(),{settings:t}=Q();return(()=>{var c=ft(),l=e.ref;return typeof l=="function"?ue(l,c):e.ref=c,$(c,(()=>{var r=z(()=>!!e.handleDragStart);return()=>r()?(()=>{var o=ft();return zt(o,"mousedown",e.handleDragStart),m(()=>p(o,i().dragHandle(t().panelLocation))),o})():null})(),null),$(c,()=>e.children,null),m(()=>p(c,i().devtoolsPanel)),c})()};L(["mousedown"]);var hi=x("<div>"),gi=x('<div><div><h3><svg xmlns=http://www.w3.org/2000/svg width=20 height=20 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx=12 cy=12 r=3></circle></svg>General</h3><p>Configure general behavior of the devtools panel.</p><div></div></div><div><h3><svg xmlns=http://www.w3.org/2000/svg width=20 height=20 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1=8 x2=16 y1=12 y2=12></line></svg>URL Configuration</h3><p>Control when devtools are available based on URL parameters.</p><div></div></div><div><h3><svg xmlns=http://www.w3.org/2000/svg width=20 height=20 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M10 8h.01"></path><path d="M12 12h.01"></path><path d="M14 8h.01"></path><path d="M16 12h.01"></path><path d="M18 8h.01"></path><path d="M6 8h.01"></path><path d="M7 16h10"></path><path d="M8 12h.01"></path><rect width=20 height=16 x=2 y=4 rx=2></rect></svg>Keyboard</h3><p>Customize keyboard shortcuts for quick access.</p><div></div></div><div><h3><svg xmlns=http://www.w3.org/2000/svg width=20 height=20 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx=12 cy=10 r=3></circle></svg>Position</h3><p>Adjust the position of the trigger button and devtools panel.</p><div><div>');const vi=()=>{const{setSettings:e,settings:i}=Q(),t=P();return(()=>{var c=gi(),l=c.firstChild,r=l.firstChild,o=r.firstChild,n=r.nextSibling,s=n.nextSibling,a=l.nextSibling,f=a.firstChild,h=f.firstChild,v=f.nextSibling,g=v.nextSibling,y=a.nextSibling,S=y.firstChild,k=S.firstChild,U=S.nextSibling,C=U.nextSibling,_=y.nextSibling,w=_.firstChild,X=w.firstChild,ee=w.nextSibling,D=ee.nextSibling,I=D.firstChild;return $(s,b(be,{label:"Default open",description:"Automatically open the devtools panel when the page loads",onChange:()=>e({defaultOpen:!i().defaultOpen}),get checked(){return i().defaultOpen}}),null),$(s,b(be,{label:"Hide trigger until hovered",description:"Keep the devtools trigger button hidden until you hover over its area",onChange:()=>e({hideUntilHover:!i().hideUntilHover}),get checked(){return i().hideUntilHover}}),null),$(g,b(be,{label:"Require URL Flag",description:"Only show devtools when a specific URL parameter is present",get checked(){return i().requireUrlFlag},onChange:u=>e({requireUrlFlag:u})}),null),$(g,b(pt,{get when(){return i().requireUrlFlag},get children(){var u=hi();return $(u,b(dt,{label:"URL flag",description:"Enter the URL parameter name (e.g., 'debug' for ?debug=true)",placeholder:"debug",get value(){return i().urlFlag},onChange:O=>e({urlFlag:O})})),m(()=>p(u,t().conditionalSetting)),u}}),null),$(C,b(dt,{label:"Hotkey to open/close devtools",description:"Use '+' to combine keys (e.g., 'Ctrl+Shift+D' or 'Alt+D')",placeholder:"Ctrl+Shift+D",get value(){return i().openHotkey.join("+")},onChange:u=>e({openHotkey:u.split("+").map(O=>At(O)).filter(Boolean)})})),$(I,b(ct,{label:"Trigger Position",options:[{label:"Bottom Right",value:"bottom-right"},{label:"Bottom Left",value:"bottom-left"},{label:"Top Right",value:"top-right"},{label:"Top Left",value:"top-left"},{label:"Middle Right",value:"middle-right"},{label:"Middle Left",value:"middle-left"}],get value(){return i().position},onChange:u=>e({position:u})}),null),$(I,b(ct,{label:"Panel Position",get value(){return i().panelLocation},options:[{label:"Top",value:"top"},{label:"Bottom",value:"bottom"}],onChange:u=>e({panelLocation:u})}),null),m(u=>{var O=t().settingsContainer,te=t().settingsSection,E=t().sectionTitle,ie=t().sectionIcon,K=t().sectionDescription,q=t().settingsGroup,re=t().settingsSection,R=t().sectionTitle,ne=t().sectionIcon,N=t().sectionDescription,W=t().settingsGroup,oe=t().settingsSection,B=t().sectionTitle,le=t().sectionIcon,j=t().sectionDescription,se=t().settingsGroup,Y=t().settingsSection,ae=t().sectionTitle,V=t().sectionIcon,de=t().sectionDescription,H=t().settingsGroup,ce=t().settingRow;return O!==u.e&&p(c,u.e=O),te!==u.t&&p(l,u.t=te),E!==u.a&&p(r,u.a=E),ie!==u.o&&d(o,"class",u.o=ie),K!==u.i&&p(n,u.i=K),q!==u.n&&p(s,u.n=q),re!==u.s&&p(a,u.s=re),R!==u.h&&p(f,u.h=R),ne!==u.r&&d(h,"class",u.r=ne),N!==u.d&&p(v,u.d=N),W!==u.l&&p(g,u.l=W),oe!==u.u&&p(y,u.u=oe),B!==u.c&&p(S,u.c=B),le!==u.w&&d(k,"class",u.w=le),j!==u.m&&p(U,u.m=j),se!==u.f&&p(C,u.f=se),Y!==u.y&&p(_,u.y=Y),ae!==u.g&&p(w,u.g=ae),V!==u.p&&d(X,"class",u.p=V),de!==u.b&&p(ee,u.b=de),H!==u.T&&p(D,u.T=H),ce!==u.A&&p(I,u.A=ce),u},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0,T:void 0,A:void 0}),c})()};var $i=x("<div><div></div><div>"),mi=x("<div><h3>");const xi=()=>{const{plugins:e,activePlugin:i,setActivePlugin:t}=Wt();let c;M(()=>{var o;const r=(o=e())==null?void 0:o.find(n=>n.id===i());c&&r&&r.render(c)});const l=P();return(()=>{var r=$i(),o=r.firstChild,n=o.nextSibling;$(o,b(ht,{get each(){return e()},children:a=>{let f;return M(()=>{f&&(typeof a.name=="string"?f.textContent=a.name:a.name(f))}),(()=>{var h=mi(),v=h.firstChild;h.$$click=()=>t(a.id);var g=f;return typeof g=="function"?ue(g,v):f=v,d(v,"id",Lt),m(()=>p(h,Z(l().pluginName,{active:i()===a.id}))),h})()}}));var s=c;return typeof s=="function"?ue(s,n):c=n,d(n,"id",Pt),m(a=>{var f=l().pluginsTabPanel,h=l().pluginsTabSidebar,v=l().pluginsTabContent;return f!==a.e&&p(r,a.e=f),h!==a.t&&p(o,a.t=h),v!==a.a&&p(n,a.a=v),a},{e:void 0,t:void 0,a:void 0}),r})()};L(["click"]);var bi=x('<svg xmlns=http://www.w3.org/2000/svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M8 6h10"></path><path d="M6 12h9"></path><path d="M11 18h7">'),yi=x('<svg xmlns=http://www.w3.org/2000/svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M12 2v2"></path><path d="M12 22v-2"></path><path d="m17 20.66-1-1.73"></path><path d="M11 10.27 7 3.34"></path><path d="m20.66 17-1.73-1"></path><path d="m3.34 7 1.73 1"></path><path d="M14 12h8"></path><path d="M2 12h2"></path><path d="m20.66 7-1.73 1"></path><path d="m3.34 17 1.73-1"></path><path d="m17 3.34-1 1.73"></path><path d="m11 13.73-4 6.93">');const ye=[{name:"Plugins",id:"plugins",component:()=>b(xi,{}),icon:bi()},{name:"Settings",id:"settings",component:()=>b(vi,{}),icon:yi()}];var ki=x('<div><button type=button><svg xmlns=http://www.w3.org/2000/svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M18 6 6 18"></path><path d="m6 6 12 12">'),wi=x("<button type=button>");const Si=e=>{const i=P(),{state:t,setState:c}=he();return(()=>{var l=ki(),r=l.firstChild;return $(l,b(ht,{each:ye,children:o=>(()=>{var n=wi();return n.$$click=()=>c({activeTab:o.id}),$(n,()=>o.icon),m(()=>p(n,Z(i().tab,{active:t().activeTab===o.id}))),n})()}),r),r.$$click=()=>e.toggleOpen(),m(o=>{var n=i().tabContainer,s=Z(i().tab,"close");return n!==o.e&&p(l,o.e=n),s!==o.t&&p(r,o.t=s),o},{e:void 0,t:void 0}),l})()};L(["click"]);var Ci=x("<div>");const _i=()=>{var l;const{state:e}=he(),i=P(),[t,c]=F(((l=ye.find(r=>r.id===e().activeTab))==null?void 0:l.component())||null);return M(()=>{var r;c(((r=ye.find(o=>o.id===e().activeTab))==null?void 0:r.component())||null)}),(()=>{var r=Ci();return $(r,t),m(()=>p(r,i().tabContent)),r})()};var Ui=x("<div>");function Fi(){const{settings:e}=Q(),{setHeight:i}=mt(),{persistOpen:t,setPersistOpen:c}=Yt(),[l,r]=F(),[o,n]=F(e().defaultOpen||t());let s;const[a,f]=F(!1),h=()=>{const g=o();n(!g),c(!g)};M(()=>{});const v=(g,y)=>{if(y.button!==0||!g)return;f(!0);const S={originalHeight:g.getBoundingClientRect().height,pageY:y.pageY},k=C=>{const _=S.pageY-C.pageY,w=e().panelLocation==="bottom"?S.originalHeight+_:S.originalHeight-_;i(w),w<70?n(!1):n(!0)},U=()=>{f(!1),document.removeEventListener("mousemove",k),document.removeEventListener("mouseUp",U)};document.addEventListener("mousemove",k),document.addEventListener("mouseup",U)};return M(()=>{var g,y,S;if(o()){const k=(y=(g=l())==null?void 0:g.parentElement)==null?void 0:y.style.paddingBottom,U=()=>{var _;if(!s)return;const C=s.getBoundingClientRect().height;(_=l())!=null&&_.parentElement&&r(w=>(w!=null&&w.parentElement&&(w.parentElement.style.paddingBottom=`${C}px`),w))};if(U(),typeof window<"u")return window.addEventListener("resize",U),()=>{var C;window.removeEventListener("resize",U),(C=l())!=null&&C.parentElement&&typeof k=="string"&&r(_=>(_.parentElement.style.paddingBottom=k,_))}}else(S=l())!=null&&S.parentElement&&r(k=>(k!=null&&k.parentElement&&k.parentElement.removeAttribute("style"),k))}),M(()=>{window.addEventListener("keydown",g=>{g.key==="Escape"&&o()&&h()})}),Vt(o),M(()=>{if(l()){const g=l(),y=getComputedStyle(g).fontSize;g==null||g.style.setProperty("--tsrd-font-size",y)}}),M(()=>{Nt(e().openHotkey,()=>{h()})}),M(()=>{}),(()=>{var g=Ui();return ue(r,g),d(g,"data-testid",ke),$(g,b(pt,{get when(){return z(()=>!!e().requireUrlFlag)()?window.location.search.includes(e().urlFlag):!0},get children(){return[b(ci,{isOpen:o,setIsOpen:h}),b(ui,{isResizing:a,isOpen:o,get children(){return b(pi,{ref:y=>s=y,handleDragStart:y=>v(s,y),get children(){return[b(Si,{toggleOpen:h}),b(_i,{})]}})}})]}})),g})()}export{Fi as default};
