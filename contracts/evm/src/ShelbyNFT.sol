// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ShelbyNFT
 * @dev NFT contract that stores metadata on Shelby Protocol
 */
contract ShelbyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    uint256 public mintPrice;
    string public baseTokenURI;
    bool public publicMintEnabled;
    
    // Mapping from token ID to Shelby CID
    mapping(uint256 => string) private _shelbyCIDs;
    
    // Events
    event TokenMinted(uint256 indexed tokenId, address indexed to, string shelbyCID);
    event BaseURIUpdated(string newBaseURI);
    event PublicMintToggled(bool enabled);
    event PriceUpdated(uint256 newPrice);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _mintPrice,
        string memory _baseTokenURI,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        baseTokenURI = _baseTokenURI;
        _nextTokenId = 1; // Start from token ID 1
    }
    
    /**
     * @dev Mint NFT with Shelby metadata
     * @param to Address to mint to
     * @param shelbyCID Shelby CID for metadata
     */
    function mint(address to, string memory shelbyCID) 
        public 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(publicMintEnabled || owner() == _msgSender(), "Public mint not enabled");
        require(_nextTokenId <= maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(bytes(shelbyCID).length > 0, "Invalid Shelby CID");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _shelbyCIDs[tokenId] = shelbyCID;
        
        emit TokenMinted(tokenId, to, shelbyCID);
    }
    
    /**
     * @dev Batch mint multiple NFTs
     * @param to Address to mint to
     * @param shelbyCIDs Array of Shelby CIDs
     */
    function batchMint(address to, string[] memory shelbyCIDs) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(shelbyCIDs.length > 0, "Empty CIDs array");
        require(_nextTokenId + shelbyCIDs.length - 1 <= maxSupply, "Exceeds max supply");
        require(msg.value >= mintPrice * shelbyCIDs.length, "Insufficient payment");
        
        for (uint256 i = 0; i < shelbyCIDs.length; i++) {
            require(bytes(shelbyCIDs[i]).length > 0, "Invalid Shelby CID");
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _shelbyCIDs[tokenId] = shelbyCIDs[i];
            emit TokenMinted(tokenId, to, shelbyCIDs[i]);
        }
    }
    
    /**
     * @dev Owner mint (free)
     */
    function ownerMint(address to, string memory shelbyCID) external onlyOwner {
        require(_nextTokenId <= maxSupply, "Max supply reached");
        require(bytes(shelbyCID).length > 0, "Invalid Shelby CID");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _shelbyCIDs[tokenId] = shelbyCID;
        
        emit TokenMinted(tokenId, to, shelbyCID);
    }
    
    /**
     * @dev Get Shelby CID for a token
     */
    function getShelbyCID(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _shelbyCIDs[tokenId];
    }
    
    /**
     * @dev Returns the token URI
     * Constructs URI using base URI + Shelby CID
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory shelbyCID = _shelbyCIDs[tokenId];
        if (bytes(shelbyCID).length > 0) {
            return string(abi.encodePacked("shelby://", shelbyCID));
        }
        
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Admin functions
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    function togglePublicMint() external onlyOwner {
        publicMintEnabled = !publicMintEnabled;
        emit PublicMintToggled(publicMintEnabled);
    }
    
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Required overrides
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
