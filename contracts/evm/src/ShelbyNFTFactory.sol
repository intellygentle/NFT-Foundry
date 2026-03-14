// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ShelbyNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShelbyNFTFactory
 * @dev Factory contract to deploy ShelbyNFT collections
 */
contract ShelbyNFTFactory is Ownable {
    struct CollectionInfo {
        address contractAddress;
        string name;
        string symbol;
        address creator;
        uint256 createdAt;
    }
    
    mapping(address => CollectionInfo[]) public creatorCollections;
    mapping(address => bool) public isCollection;
    address[] public allCollections;
    
    uint256 public deploymentFee;
    
    event CollectionDeployed(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {
        deploymentFee = 0.001 ether; // Default deployment fee
    }
    
    /**
     * @dev Deploy a new NFT collection
     */
    function deployCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 mintPrice,
        string memory baseTokenURI
    ) external payable returns (address) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(maxSupply > 0, "Max supply must be greater than 0");
        
        // Deploy new collection
        ShelbyNFT newCollection = new ShelbyNFT(
            name,
            symbol,
            maxSupply,
            mintPrice,
            baseTokenURI,
            msg.sender // Collection creator becomes owner
        );
        
        address collectionAddress = address(newCollection);
        
        // Store collection info
        CollectionInfo memory info = CollectionInfo({
            contractAddress: collectionAddress,
            name: name,
            symbol: symbol,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        creatorCollections[msg.sender].push(info);
        isCollection[collectionAddress] = true;
        allCollections.push(collectionAddress);
        
        emit CollectionDeployed(msg.sender, collectionAddress, name, symbol);
        
        return collectionAddress;
    }
    
    /**
     * @dev Get collections created by an address
     */
    function getCreatorCollections(address creator) 
        external 
        view 
        returns (CollectionInfo[] memory) 
    {
        return creatorCollections[creator];
    }
    
    /**
     * @dev Get total number of collections
     */
    function getTotalCollections() external view returns (uint256) {
        return allCollections.length;
    }
    
    /**
     * @dev Admin functions
     */
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
