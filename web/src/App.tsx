import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { Login, Register } from './pages/AuthPages';
import { Publish } from './pages/Publish';
import { PublishPay } from './pages/PublishPay';
import { MyProducts } from './pages/MyProducts';
import { Chat } from './pages/Chat';
import { Inbox } from './pages/Inbox';
import { Seek } from './pages/Seek';
import { NotificationsPage } from './pages/NotificationsPage';
import { RepeatClients } from './pages/RepeatClients';
import { VerifyAccount } from './pages/VerifyAccount';
import { AccountPage } from './pages/AccountPage';
import { RentalRequestsPage } from './pages/RentalRequestsPage';
import {
  HelpPage,
  HowItWorksPage,
  PrivacyPage,
  SafetyPage,
  TermsPage,
} from './pages/TrustPages';
import './pages/Chat.css';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="producto/:id" element={<ProductDetail />} />
        <Route path="entrar" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="verificar" element={<VerifyAccount />} />
        <Route path="cuenta" element={<AccountPage />} />
        <Route path="publicar" element={<Publish />} />
        <Route path="publicar/pago" element={<PublishPay />} />
        <Route path="mis-productos" element={<MyProducts />} />
        <Route path="busco" element={<Seek />} />
        <Route path="demandas" element={<RentalRequestsPage />} />
        <Route path="mensajes" element={<Inbox />} />
        <Route path="notificaciones" element={<NotificationsPage />} />
        <Route path="clientes" element={<RepeatClients />} />
        <Route path="chat/:threadId" element={<Chat />} />
        <Route path="como-funciona" element={<HowItWorksPage />} />
        <Route path="seguridad" element={<SafetyPage />} />
        <Route path="privacidad" element={<PrivacyPage />} />
        <Route path="terminos" element={<TermsPage />} />
        <Route path="ayuda" element={<HelpPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
