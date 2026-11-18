import BankSearch from './BankSearch';
import { enableManualBankEntry } from '../../utils/bankDirectoryData';

const BankTransferDetails = ({
  details,
  onChange,
  onBankSelect,
  onManualEntry,
  onChangeSelection,
  onSearchDirectory,
  children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <BankSearch
      details={details}
      onBankSelect={onBankSelect}
      onManualEntry={(currentDetails) => onManualEntry(enableManualBankEntry(currentDetails))}
      onChangeSelection={onChangeSelection}
      onSearchDirectory={onSearchDirectory}
    />
    {children}
  </div>
);

export default BankTransferDetails;
